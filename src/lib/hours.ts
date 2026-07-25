export function calculateHoursNeeded(
    amount: number,
    monthlySalary: number,
    hoursPerWeek: number,
): number {
    const monthlyHours = (hoursPerWeek * 52) / 12;
    const hourlyRate = monthlySalary / monthlyHours;
    return amount / hourlyRate;
}

export function getWorkBreakdown(
    hoursWorked: number,
    hoursPerWeek: number | null,
): { days: number; hours: number; minutes: number } {
    const totalMinutes = Math.round(hoursWorked * 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hoursPerDay = hoursPerWeek
        ? Math.max(1, Math.round(hoursPerWeek / 5))
        : 8;
    const days = Math.floor(totalHours / hoursPerDay);
    const remainingHours = totalHours % hoursPerDay;

    return { days, hours: remainingHours, minutes };
}
