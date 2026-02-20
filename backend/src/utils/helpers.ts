//
export function PrintBoard(board: number[][]): void {
	for (const row of board) {
		console.log(row.map(cell => (cell === 1 ? 'X' : '.')).join(' '));
	}
}
