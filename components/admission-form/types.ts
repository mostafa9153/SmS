export interface SchoolInfo {
  name: string;
  subTitle?: string;
  address: string;
  districtStatePin: string;
  contact: string;
  logoUrl?: string;
}

export const DEFAULT_SCHOOL_INFO: SchoolInfo = {
  name: "MARIGACHI HIGH SCHOOL (H.S.)",
  address: "Vill+P. O. : MARIGACHI, P. S. : DIAMOND HARBOUR",
  districtStatePin: "Dt: SOUTH 24 PARGANAS, State: WEST BENGAL, PIN - 743368",
  contact: "Mobile: 9800971797, Email: marigachihighschool@gmail.com",
  logoUrl: "/logo.png",
};

export interface OfficeUseData {
  doa?: string; // Date of Admission (especially for Class 11)
  slNo?: string;
  class?: string;
  sec?: string;
  rollNo?: string;
}

export interface BasicInfoData {
  nameEng?: string;
  nameBen?: string;
  dob?: string; // YYYY-MM-DD
  birthRegNo?: string;
  gender?: "MALE" | "FEMALE" | "TRANSGENDER" | "";
  socialCategory?: string; // General / SC / ST / OBC-A / OBC-B
  religion?: string;
  motherTongue?: string;
  nationality?: string;
  aadhaarNo?: string; // 12 digits
  bloodGroup?: string;
  studentId?: string;
  healthId?: string;
  identificationMark?: string;
}

export interface EducationalInfoVIxData {
  presentClass?: string;
  presentSection?: string;
  presentRoll?: string;
  presentStream?: string;
  previousClass?: string;
  previousSection?: string;
  previousRoll?: string;
  previousStream?: string;
  medium?: string;
  attendanceDays?: string;
}

export interface EducationalInfoXIData {
  previousSchoolName?: string;
  marksObtained?: string;
  percentage?: string;
  bengMarks?: string;
  engMarks?: string;
  mathMarks?: string;
  lscMarks?: string;
  pscMarks?: string;
  histMarks?: string;
  geoMarks?: string;
}

export interface ContactInfoData {
  village?: string;
  locality?: string;
  district?: string;
  blockMunicipality?: string;
  panchayat?: string;
  postOffice?: string;
  policeStation?: string;
  pinCode?: string;
  contactNo?: string;
  email?: string;
}

export interface BankDetailsData {
  bankName?: string;
  branch?: string;
  ifsc?: string;
  accountNumber?: string;
}

export interface GuardianDetailsData {
  fatherNameEng?: string;
  fatherNameBen?: string;
  motherNameEng?: string;
  motherNameBen?: string;
  guardianNameEng?: string;
  guardianNameBen?: string;
  relationship?: string;
  annualIncome?: string;
  guardianQualification?: string;
}

export interface OtherInfoData {
  bplStatus?: "YES" | "NO" | "";
  bplNo?: string;
  cwsnStatus?: "YES" | "NO" | ""; // Children with special need
  disabilityType?: string;
}

export interface AdmissionFormVIxData {
  formNo?: string;
  academicYear: string;
  officeUse: OfficeUseData;
  basicInfo: BasicInfoData;
  educationalInfo: EducationalInfoVIxData;
  contactInfo: ContactInfoData;
  bankDetails: BankDetailsData;
  guardianDetails: GuardianDetailsData;
  guardianContact: ContactInfoData;
  otherInfo: OtherInfoData;
}

export interface AdmissionFormXIData {
  formNo?: string;
  academicYear: string;
  officeUse: OfficeUseData;
  basicInfo: BasicInfoData;
  educationalInfo: EducationalInfoXIData;
  contactInfo: ContactInfoData;
  bankDetails: BankDetailsData;
  guardianDetails: GuardianDetailsData;
  guardianContact: ContactInfoData;
  otherInfo: OtherInfoData;
}

export function formatFormNumber(prefix: string, serial: number, padding: number = 3): string {
  const cleanPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const serialStr = padding > 0 ? String(serial).padStart(padding, "0") : String(serial);
  return `${cleanPrefix}${serialStr}`;
}

export const BLANK_FORM_V_IX: AdmissionFormVIxData = {
  formNo: "MHS/AF/26/001",
  academicYear: "2026",
  officeUse: {
    slNo: "",
    class: "",
    sec: "",
    rollNo: "",
  },
  basicInfo: {
    nameEng: "",
    nameBen: "",
    dob: "",
    birthRegNo: "",
    gender: "",
    socialCategory: "",
    religion: "",
    motherTongue: "",
    nationality: "",
    aadhaarNo: "",
    bloodGroup: "",
    studentId: "",
    healthId: "",
    identificationMark: "",
  },
  educationalInfo: {
    presentClass: "",
    presentSection: "",
    presentRoll: "",
    presentStream: "",
    previousClass: "",
    previousSection: "",
    previousRoll: "",
    previousStream: "",
    medium: "",
    attendanceDays: "",
  },
  contactInfo: {
    village: "",
    locality: "",
    district: "",
    blockMunicipality: "",
    panchayat: "",
    postOffice: "",
    policeStation: "",
    pinCode: "",
    contactNo: "",
    email: "",
  },
  bankDetails: {
    bankName: "",
    branch: "",
    ifsc: "",
    accountNumber: "",
  },
  guardianDetails: {
    fatherNameEng: "",
    fatherNameBen: "",
    motherNameEng: "",
    motherNameBen: "",
    guardianNameEng: "",
    guardianNameBen: "",
    relationship: "",
    annualIncome: "",
    guardianQualification: "",
  },
  guardianContact: {
    village: "",
    locality: "",
    district: "",
    blockMunicipality: "",
    panchayat: "",
    postOffice: "",
    policeStation: "",
    pinCode: "",
    contactNo: "",
    email: "",
  },
  otherInfo: {
    bplStatus: "",
    bplNo: "",
    cwsnStatus: "",
    disabilityType: "",
  },
};

export const BLANK_FORM_XI: AdmissionFormXIData = {
  formNo: "MHS/AF/26/001",
  academicYear: "2026",
  officeUse: {
    doa: "",
    slNo: "",
    class: "XI",
    sec: "",
    rollNo: "",
  },
  basicInfo: {
    nameEng: "",
    nameBen: "",
    dob: "",
    birthRegNo: "",
    gender: "",
    socialCategory: "",
    religion: "",
    motherTongue: "",
    nationality: "",
    aadhaarNo: "",
    bloodGroup: "",
    studentId: "",
    healthId: "",
    identificationMark: "",
  },
  educationalInfo: {
    previousSchoolName: "",
    marksObtained: "",
    percentage: "",
    bengMarks: "",
    engMarks: "",
    mathMarks: "",
    lscMarks: "",
    pscMarks: "",
    histMarks: "",
    geoMarks: "",
  },
  contactInfo: {
    village: "",
    locality: "",
    district: "",
    blockMunicipality: "",
    panchayat: "",
    postOffice: "",
    policeStation: "",
    pinCode: "",
    contactNo: "",
    email: "",
  },
  bankDetails: {
    bankName: "",
    branch: "",
    ifsc: "",
    accountNumber: "",
  },
  guardianDetails: {
    fatherNameEng: "",
    fatherNameBen: "",
    motherNameEng: "",
    motherNameBen: "",
    guardianNameEng: "",
    guardianNameBen: "",
    relationship: "",
    annualIncome: "",
    guardianQualification: "",
  },
  guardianContact: {
    village: "",
    locality: "",
    district: "",
    blockMunicipality: "",
    panchayat: "",
    postOffice: "",
    policeStation: "",
    pinCode: "",
    contactNo: "",
    email: "",
  },
  otherInfo: {
    bplStatus: "",
    bplNo: "",
    cwsnStatus: "",
    disabilityType: "",
  },
};
