export const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const pad = (number: number) => String(number).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
