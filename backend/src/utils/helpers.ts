//
export function PrintBoard(board: number[][]): void {
	for (const row of board) {
		console.log(row.map(cell => (cell === 1 ? 'X' : '.')).join(' '));
	}
}

export function ToStringFormat(value: unknown): string | void {
	try {
		return JSON.stringify(value, null, 2);
	} catch (error) {
		console.error('Unable to stringify value:', value, error);
	}
}
