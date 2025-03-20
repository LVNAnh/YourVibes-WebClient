import dayjs from "dayjs";

export const DateTransfer = (date?: string | Date) => {
  return dayjs(date).format("DD/MM/YYYY");
}

export const getTimeDiff = (date?: string, localString?: any) => {
  const now = dayjs();
  const postDate = dayjs(date);

  const minutesDiff = now.diff(postDate, 'minute');
  const hoursDiff = now.diff(postDate, 'hour');
  const daysDiff = now.diff(postDate, 'day');

  if (minutesDiff < 60) {
    return `${minutesDiff} ${localString?.Public?.MinuteAgo}`;
  } else if (hoursDiff < 24) {
    return `${hoursDiff} ${localString?.Public?.HourAgo}`;
  } else {
    return `${daysDiff} ${localString?.Public?.DayAgo}`;
  }
};

export const getDayDiff = (date: Date) => {
  return Math.round(dayjs(date).diff(dayjs(), 'day', true));
}