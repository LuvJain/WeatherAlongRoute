/**
 * Time utilities for route weather calculations
 */

/**
 * Converts seconds from now to a Unix timestamp
 * @param {Number} secondsFromNow - Number of seconds from the current time
 * @returns {Number} - Unix timestamp (seconds since epoch)
 */
export const secondsToTimestamp = (secondsFromNow) => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return now + secondsFromNow;
};

/**
 * Formats a Unix timestamp to a readable time string
 * @param {Number} timestamp - Unix timestamp in seconds
 * @returns {String} - Formatted time string (e.g., "14:30")
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formats a Unix timestamp to a readable date and time string
 * @param {Number} timestamp - Unix timestamp in seconds
 * @returns {String} - Formatted date and time string (e.g., "Mon, 15 Jan 2024 14:30")
 */
export const formatDateTime = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Calculates the estimated arrival time based on current time and duration in seconds
 * @param {Number} durationSeconds - Duration in seconds
 * @returns {Number} - Estimated arrival timestamp
 */
export const calculateArrivalTime = (durationSeconds) => {
  return secondsToTimestamp(durationSeconds);
};