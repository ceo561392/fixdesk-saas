export const statusLabels: Record<string, string> = {
  open: "รอดำเนินการ",
  assigned: "มอบหมายแล้ว",
  in_progress: "กำลังดำเนินการ",
  resolved: "แก้ไขแล้ว",
  closed: "ปิดงาน",
  cancelled: "ยกเลิก",
};
export const priorityLabels: Record<string, string> = {
  low: "ต่ำ",
  normal: "ปกติ",
  high: "สูง",
  urgent: "เร่งด่วน",
};
export const assetStatusLabels: Record<string, string> = {
  active: "พร้อมใช้งาน",
  maintenance: "อยู่ระหว่างซ่อม",
  retired: "เลิกใช้งาน",
};
export const roleLabels: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  technician: "ช่างไอที",
  requester: "ผู้แจ้งซ่อม",
};
export const date = (value: string) =>
  new Date(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  });
export const dateTime = (value: string) =>
  new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  });
