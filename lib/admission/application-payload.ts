import type { AdmissionFormData } from "@/lib/validations/admission-form-schema";

/** Request body for an online application, shared by the staff apply page and the public link. */
export function toOnlineApplicationPayload(formData: AdmissionFormData, academicYear: number | string) {
  return {
    ...formData,
    targetClass: formData.presentClass,
    admissionType: "new",
    formMethod: "online",
    academicYear: String(academicYear),
    // Flattened address strings
    address: `${formData.presentVillage || ""}, ${formData.presentPostOffice || ""}, ${formData.presentPoliceStation || ""}, ${formData.presentDistrict || ""} - ${formData.presentPincode || ""}`.replace(/^, /, ""),
    village: formData.presentVillage,
    gramPanchayat: formData.presentPanchayat,
    block: formData.presentBlock,
    postOffice: formData.presentPostOffice,
    policeStation: formData.presentPoliceStation,
    district: formData.presentDistrict,
    pincode: formData.presentPincode,
  };
}
