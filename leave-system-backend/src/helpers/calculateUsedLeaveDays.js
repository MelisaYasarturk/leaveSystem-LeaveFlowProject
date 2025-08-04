function calculateUsedLeaveDays(leaves) {
  let total = 0;

  for (const leave of leaves) {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    total += days;
  }

  return total;
}

module.exports = calculateUsedLeaveDays;
