import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedUserRole } from "@/lib/supabase/auth-helper";

export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedUserRole();
    if (auth.role === "Guest") {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64;

    // Load API Key from admission_settings or environment
    const supabase = createAdminClient();
    let apiKey = process.env.GEMINI_API_KEY || "";
    let provider = "gemini";
    let model = "gemini-1.5-flash";

    try {
      const { data: settings } = await supabase
        .from("admission_settings")
        .select("*")
        .eq("school_id", "default")
        .single();

      if (settings?.ai_api_key) {
        apiKey = settings.ai_api_key;
        provider = settings.ai_provider || "gemini";
        model = settings.ai_model || "gemini-1.5-flash-latest";
        // Override deprecated model names
        if (model === "gemini-1.5-flash") {
          model = "gemini-1.5-flash-latest";
        }
      }
    } catch {
      // Fallback to env
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "No AI API Key found. Please save your Google Gemini API Key in Admission > Settings.",
          missingKey: true,
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert OCR & School Admission Document parser for Indian Secondary Schools (West Bengal).
Analyze the provided image of an admission form (handwritten or printed) and extract all recognizable student information.
Return ONLY a valid JSON object without markdown formatting, code fences or explanations.
Follow this JSON structure:
{
  "studentName": "",
  "gender": "Male",
  "dob": "YYYY-MM-DD",
  "targetClass": "V",
  "fatherName": "",
  "motherName": "",
  "guardianName": "",
  "studentContact": "",
  "altMobile": "",
  "aadhaar": "",
  "address": "",
  "village": "",
  "postOffice": "",
  "policeStation": "",
  "district": "",
  "pincode": "",
  "religion": "Islam",
  "socialCategory": "General",
  "bloodGroup": "",
  "previousSchool": "",
  "previousClass": "",
  "previousRoll": ""
}
If a field is unclear or missing, leave it as an empty string.`;

    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiPayload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1,
        },
      };

      const aiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error("Gemini API Error:", errText);
        return NextResponse.json(
          { error: `Gemini API request failed (${aiRes.status}): ${errText}` },
          { status: 502 }
        );
      }

      const aiData = await aiRes.json();
      const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      // Parse JSON
      let extracted: Record<string, any> = {};
      try {
        const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        extracted = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("JSON parse fallback on raw text:", rawText);
        extracted = { rawText };
      }

      return NextResponse.json({
        success: true,
        provider: "gemini",
        extracted,
      });
    }

    // OpenAI provider fallback
    const openAiPayload = {
      model: model.includes("gpt") ? model : "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract form details:" },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openAiPayload),
    });

    if (!oaiRes.ok) {
      const err = await oaiRes.text();
      return NextResponse.json({ error: `OpenAI API failed: ${err}` }, { status: 502 });
    }

    const oaiData = await oaiRes.json();
    const content = oaiData?.choices?.[0]?.message?.content || "{}";
    const extracted = JSON.parse(content);

    return NextResponse.json({
      success: true,
      provider: "openai",
      extracted,
    });
  } catch (err: any) {
    console.error("AI Scan Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
