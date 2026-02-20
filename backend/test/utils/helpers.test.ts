import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { PrintBoard, ToStringFormat } from '../../src/utils/helpers';

describe('helpers', () => {
	let logSpy: ReturnType<typeof jest.spyOn>;
	let errorSpy: ReturnType<typeof jest.spyOn>;

	beforeEach(() => {
		logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		logSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it('PrintBoard logs board rows with visual formatting', () => {
		PrintBoard([
			[0, 1],
			[1, 0],
		]);

		expect(logSpy).toHaveBeenNthCalledWith(1, '. X');
		expect(logSpy).toHaveBeenNthCalledWith(2, 'X .');
	});

	it('ToStringFormat returns pretty JSON for valid values', () => {
		const value = { answer: 42 };

		expect(ToStringFormat(value)).toBe(JSON.stringify(value, null, 2));
	});

	it('ToStringFormat returns void for circular values and logs error', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		expect(ToStringFormat(circular)).toBeUndefined();
		expect(errorSpy).toHaveBeenCalled();
	});
});
