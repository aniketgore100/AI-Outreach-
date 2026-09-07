const { DateTime } = require("luxon");

const { CAMPAIGN_WEEKDAYS } = require("../config/constants");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** luxon's DateTime#weekday is 1 (Monday) .. 7 (Sunday) — maps directly onto
 * CAMPAIGN_WEEKDAYS' index order (["mon", ..., "sun"]). */
function weekdayKey(dateTime) {
  return CAMPAIGN_WEEKDAYS[dateTime.weekday - 1];
}

/** DST-safe: converts the instant into the campaign's IANA zone before
 * comparing weekday/time-of-day, so "9am-5pm" means local 9am-5pm regardless
 * of when a DST transition falls. */
function isWithinSendingWindow(now, { timeZone, weekdays, startTime, endTime }) {
  const local = DateTime.fromJSDate(now, { zone: timeZone });
  if (!local.isValid) return false;

  if (!weekdays.includes(weekdayKey(local))) return false;

  const currentTime = local.toFormat("HH:mm");
  return currentTime >= startTime && currentTime < endTime;
}

function computeNextActionAt(from, delayDays, unitMs = MS_PER_DAY) {
  return new Date(from.getTime() + delayDays * unitMs);
}

module.exports = { isWithinSendingWindow, computeNextActionAt };
