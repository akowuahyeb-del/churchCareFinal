// utils/dateUtils.js

export const formatDate = (value) => {
  if (!value) return "";

  try {
    const date = new Date(value);

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
};
export const todayDisplayDate = () => {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};