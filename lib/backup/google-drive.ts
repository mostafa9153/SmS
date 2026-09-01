// ============================================================
//  lib/backup/google-drive.ts
//  Direct Google OAuth 2.0 & Google Drive v3 REST client
//  No external heavy dependencies needed!
// ============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { BackupFrequency, BackupPayload, DriveBackupFile, GoogleAccountInfo } from "./types";

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

const DRIVE_FOLDER_NAME = "SMS_School_Backups";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

interface StoredBackupConfig {
  refreshToken?: string;
  email?: string;
  name?: string;
  picture?: string;
  folderId?: string;
  folderName?: string;
  frequency: BackupFrequency;
  connectedAt?: string;
  lastBackupAt?: string;
  lastBackupStatus?: "success" | "failed";
  lastBackupMessage?: string;
}

// -------------------------------------------------------------
// 1. Config Persistence in Database (using dedicated system_config table with fallback)
// -------------------------------------------------------------
export async function getBackupConfig(): Promise<StoredBackupConfig> {
  const supabase = createAdminClient();

  // 1. Try reading from dedicated system_config table
  try {
    const { data: configData, error: configError } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "backup_settings")
      .maybeSingle();

    if (!configError && configData && configData.value) {
      const meta = configData.value as StoredBackupConfig;
      return {
        ...meta,
        frequency: meta.frequency || "monthly",
      };
    }
  } catch {
    // Fall back to legacy audit_log retrieval
  }

  // 2. Fallback to audit_log for backward compatibility
  const { data, error } = await supabase
    .from("audit_log")
    .select("metadata")
    .eq("action", "SYSTEM_CONFIG")
    .eq("table_name", "backup_settings")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.metadata) {
    return { frequency: "monthly" };
  }

  const meta = (data.metadata || {}) as StoredBackupConfig;
  return {
    ...meta,
    frequency: meta.frequency || "monthly",
  };
}

export async function saveBackupConfig(newConfig: Partial<StoredBackupConfig>, adminUserId?: string) {
  const current = await getBackupConfig();
  const merged: StoredBackupConfig = {
    ...current,
    ...newConfig,
  };

  const supabase = createAdminClient();

  // 1. Try persisting into system_config table
  try {
    const { error: upsertError } = await supabase
      .from("system_config")
      .upsert({
        key: "backup_settings",
        value: merged,
        updated_at: new Date().toISOString(),
      });

    if (!upsertError) {
      return merged;
    }
  } catch {
    // Fall back to audit_log persistence
  }

  // 2. Fallback to audit_log
  await supabase.from("audit_log").insert({
    performed_by: adminUserId || null,
    action: "SYSTEM_CONFIG",
    table_name: "backup_settings",
    metadata: merged,
  });

  return merged;
}

// -------------------------------------------------------------
// 2. Google OAuth 2.0 Auth URL Generation
// -------------------------------------------------------------
export function generateGoogleAuthUrl(redirectUri: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID in environment variables.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // Force Google to return a refresh token
    include_granted_scopes: "true",
  });

  if (state) {
    params.set("state", state);
  }

  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

// -------------------------------------------------------------
// 3. Exchange Authorization Code for Tokens
// -------------------------------------------------------------
export async function exchangeCodeForTokens(code: string, redirectUri: string, adminUserId?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are not properly configured.");
  }

  const tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Token exchange failed:", errText);
    throw new Error(`Failed to exchange authorization code: ${errText}`);
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;

  if (!refreshToken) {
    console.warn("No refresh token returned by Google. User may have already granted access.");
  }

  // Fetch Google User Profile (email & name)
  let userInfo: { email?: string; name?: string; picture?: string } = {};
  try {
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userRes.ok) {
      userInfo = await userRes.json();
    }
  } catch (err) {
    console.warn("Could not fetch user info:", err);
  }

  // Find or create the dedicated backup folder
  let folderId: string | undefined;
  try {
    folderId = await getOrCreateBackupFolder(accessToken);
  } catch (err) {
    console.warn("Could not create/find backup folder during auth exchange:", err);
  }

  // Save the refresh token in config
  await saveBackupConfig(
    {
      refreshToken: refreshToken || (await getBackupConfig()).refreshToken,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      connectedAt: new Date().toISOString(),
      folderId,
      folderName: DRIVE_FOLDER_NAME,
    },
    adminUserId
  );

  return {
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
}

// -------------------------------------------------------------
// 4. Get Valid Access Token using Refresh Token
// -------------------------------------------------------------
export async function getValidAccessToken(): Promise<string> {
  const config = await getBackupConfig();
  if (!config.refreshToken) {
    throw new Error("No Google Account is currently connected. Please connect Google Drive first.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials are missing in environment variables.");
  }

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Refresh token error:", errText);
    throw new Error(`Google authorization expired or revoked. Please reconnect Google Drive.`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// -------------------------------------------------------------
// 5. Get or Create Dedicated Backup Folder in Google Drive
// -------------------------------------------------------------
export async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  // 1. Search for existing folder
  const query = encodeURIComponent(
    `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(`${GOOGLE_DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // 2. Folder does not exist, create it
  const createRes = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Automated snapshots and backups for School Management System",
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create backup folder in Google Drive: ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

// -------------------------------------------------------------
// 6. Upload JSON Backup Snapshot to Google Drive
// -------------------------------------------------------------
export async function uploadSnapshotToDrive(payload: BackupPayload): Promise<DriveBackupFile> {
  const accessToken = await getValidAccessToken();
  const folderId = await getOrCreateBackupFolder(accessToken);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const fileName = `SMS_Backup_${timestamp}.json`;
  const fileContent = JSON.stringify(payload, null, 2);

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: "application/json",
    description: `SMS Web App Snapshot. Students: ${payload.metadata.counts.students}, Results: ${payload.metadata.counts.studentResults}`,
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    fileContent +
    closeDelimiter;

  const uploadRes = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    await saveBackupConfig({
      lastBackupAt: new Date().toISOString(),
      lastBackupStatus: "failed",
      lastBackupMessage: errText.slice(0, 200),
    });
    throw new Error(`Failed to upload backup to Google Drive: ${errText}`);
  }

  const uploadedFile = await uploadRes.json();

  // Update success metadata
  await saveBackupConfig({
    lastBackupAt: new Date().toISOString(),
    lastBackupStatus: "success",
    lastBackupMessage: `Backup uploaded successfully (${fileName})`,
  });

  return {
    id: uploadedFile.id,
    name: fileName,
    sizeBytes: Buffer.byteLength(fileContent, "utf8"),
    createdAt: new Date().toISOString(),
    description: metadata.description,
    metadataSummary: {
      studentsCount: payload.metadata.counts.students,
      resultsCount: payload.metadata.counts.studentResults,
    },
  };
}

// -------------------------------------------------------------
// 7. List Backups from Google Drive
// -------------------------------------------------------------
export async function listDriveBackups(): Promise<DriveBackupFile[]> {
  try {
    const accessToken = await getValidAccessToken();
    const folderId = await getOrCreateBackupFolder(accessToken);

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const listRes = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,size,createdTime,description)&pageSize=50`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Failed to list Drive backups: ${errText}`);
    }

    const data = await listRes.json();
    const files = (data.files || []) as any[];

    return files.map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: parseInt(f.size || "0", 10),
      createdAt: f.createdTime,
      description: f.description || "",
    }));
  } catch (err: any) {
    console.error("Error listing Drive backups:", err);
    throw err;
  }
}

// -------------------------------------------------------------
// 8. Download Backup Snapshot from Google Drive
// -------------------------------------------------------------
export async function downloadDriveBackup(fileId: string): Promise<BackupPayload> {
  const accessToken = await getValidAccessToken();

  const downloadRes = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!downloadRes.ok) {
    const errText = await downloadRes.text();
    throw new Error(`Failed to download backup file from Drive: ${errText}`);
  }

  const rawJson = await downloadRes.json();
  return rawJson as BackupPayload;
}

// -------------------------------------------------------------
// 9. Delete a Specific Backup File from Google Drive
// -------------------------------------------------------------
export async function deleteDriveBackup(fileId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken();

  const res = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok;
}

// -------------------------------------------------------------
// 10. Disconnect Google Drive
// -------------------------------------------------------------
export async function disconnectGoogleDrive(adminUserId?: string) {
  await saveBackupConfig(
    {
      refreshToken: undefined,
      email: undefined,
      name: undefined,
      picture: undefined,
      folderId: undefined,
      lastBackupMessage: "Google Drive disconnected by admin.",
    },
    adminUserId
  );
}

// -------------------------------------------------------------
// 11. Helper to Get UI Account Info
// -------------------------------------------------------------
export async function getGoogleAccountStatus(): Promise<GoogleAccountInfo> {
  const config = await getBackupConfig();
  const hasToken = !!config.refreshToken;

  return {
    isConnected: hasToken,
    email: config.email,
    name: config.name,
    picture: config.picture,
    connectedAt: config.connectedAt,
    folderId: config.folderId,
    folderName: config.folderName || DRIVE_FOLDER_NAME,
    frequency: config.frequency || "monthly",
    lastBackupAt: config.lastBackupAt,
    lastBackupStatus: config.lastBackupStatus,
    lastBackupMessage: config.lastBackupMessage,
  };
}
