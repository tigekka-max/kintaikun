export type ExpenseStatus = "unsubmitted" | "submitted" | "approved" | "rejected";
export type AssignmentStatus = "draft" | "confirmed";

export const member = {
  name: "山田太郎",
  monthlyWorkDays: 5,
  dailyRateTotal: 60000,
  transportationTotal: 8400,
  paymentTotal: 68400
};

export const assignments = [
  {
    id: "a1",
    date: "2026-06-08",
    labelDate: "6/8(土)",
    projectTitle: "auイベント",
    storeName: "〇〇店",
    address: "東京都新宿区西新宿1-1-1",
    meetingTime: "9:40",
    workTime: "10:00-18:00",
    breakMinutes: 60,
    dailyRate: 12000,
    memo: "入口前で集合。担当者に到着連絡。",
    expenseStatus: "unsubmitted" as ExpenseStatus,
    expenseAmount: 0
  },
  {
    id: "a2",
    date: "2026-06-15",
    labelDate: "6/15(土)",
    projectTitle: "docomoイベント",
    storeName: "△△店",
    address: "神奈川県横浜市西区南幸1-1-1",
    meetingTime: "9:40",
    workTime: "10:00-18:00",
    breakMinutes: 60,
    dailyRate: 13000,
    memo: "バックヤードで朝礼あり。",
    expenseStatus: "submitted" as ExpenseStatus,
    expenseAmount: 1800
  },
  {
    id: "a3",
    date: "2026-06-22",
    labelDate: "6/22(土)",
    projectTitle: "SoftBankイベント",
    storeName: "□□店",
    address: "埼玉県さいたま市大宮区桜木町1-1-1",
    meetingTime: "9:40",
    workTime: "10:00-18:00",
    breakMinutes: 60,
    dailyRate: 12000,
    memo: "スタッフ証を忘れないこと。",
    expenseStatus: "approved" as ExpenseStatus,
    expenseAmount: 1400
  }
];

export const shiftDays = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const date = new Date(2026, 5, day);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const holiday = false;
  return {
    day,
    label: `6/${day}(${weekday})`,
    weekend,
    holiday,
    defaultValue: weekend ? "yes" : "no"
  };
});

export const operatingShiftDays = shiftDays.filter((day) => day.weekend || day.holiday);

export const adminStats = {
  submittedMembers: 12,
  totalMembers: 15,
  missingMembers: 3,
  unassignedProjects: 4,
  submittedExpenses: 8,
  paymentTotal: 842000
};

export const projects = [
  {
    id: "p1",
    date: "6/8(土)",
    title: "auイベント",
    storeName: "〇〇店",
    requiredPeople: 2,
    assignedPeople: 1,
    dailyRate: 12000,
    status: "draft" as AssignmentStatus
  },
  {
    id: "p2",
    date: "6/15(土)",
    title: "docomoイベント",
    storeName: "△△店",
    requiredPeople: 3,
    assignedPeople: 3,
    dailyRate: 13000,
    status: "confirmed" as AssignmentStatus
  },
  {
    id: "p3",
    date: "6/22(土)",
    title: "SoftBankイベント",
    storeName: "□□店",
    requiredPeople: 2,
    assignedPeople: 0,
    dailyRate: 12000,
    status: "draft" as AssignmentStatus
  }
];

export const candidateMembers = [
  { id: "m1", name: "佐藤花子", baseDailyRate: 12000 },
  { id: "m2", name: "鈴木一郎", baseDailyRate: 13000 },
  { id: "m3", name: "高橋健", baseDailyRate: 12000 }
];

export const settlementRows = [
  {
    memberName: "山田太郎",
    workDays: 5,
    dailyRateTotal: 60000,
    transportationTotal: 8400,
    paymentTotal: 68400,
    pendingExpenses: 2
  },
  {
    memberName: "佐藤花子",
    workDays: 4,
    dailyRateTotal: 52000,
    transportationTotal: 6200,
    paymentTotal: 58200,
    pendingExpenses: 0
  },
  {
    memberName: "鈴木一郎",
    workDays: 6,
    dailyRateTotal: 72000,
    transportationTotal: 9800,
    paymentTotal: 81800,
    pendingExpenses: 1
  }
];

export function yen(value: number) {
  return `${value.toLocaleString("ja-JP")}円`;
}
