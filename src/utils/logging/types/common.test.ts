import { describe, it, expect } from 'vitest';
import { Ok, Err, Result } from './common';

describe('Common Utility Types', () => {
  describe('Result Type', () => {
    it('should create a successful Result with Ok', () => {
      const result = Ok('success');
      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should create a failed Result with Err', () => {
      const error = new Error('test error');
      const result = Err(error);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.value).toBeUndefined();
    });

    it('should handle complex value types', () => {
      const complexValue = { id: 1, name: 'test', data: [1, 2, 3] };
      const result = Ok(complexValue);
      expect(result.success).toBe(true);
      expect(result.value).toEqual(complexValue);
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('custom error', 'TEST_CODE');
      const result = Err(customError);
      expect(result.success).toBe(false);
      expect(result.error).toBe(customError);
      expect(result.error?.code).toBe('TEST_CODE');
    });

    it('should work with type narrowing', () => {
      function handleResult(result: Result<string, Error>): string {
        if (result.success) {
          return `Success: ${result.value}`;
        } else {
          return `Error: ${result.error.message}`;
        }
      }

      const successResult = Ok('hello');
      const errorResult = Err(new Error('failed'));

      expect(handleResult(successResult)).toBe('Success: hello');
      expect(handleResult(errorResult)).toBe('Error: failed');
    });

    it('should allow context information', () => {
      const result: Result<string, Error> = {
        success: true,
        value: 'test',
        context: { requestId: '123', userId: '456' },
      };

      expect(result.success).toBe(true);
      expect(result.value).toBe('test');
      expect(result.context).toEqual({ requestId: '123', userId: '456' });
    });
  });

  describe('Result Pattern Usage', () => {
    it('should demonstrate chain-like operations', () => {
      function divide(a: number, b: number): Result<number, Error> {
        if (b === 0) {
          return Err(new Error('Division by zero'));
        }
        return Ok(a / b);
      }

      function square(result: Result<number, Error>): Result<number, Error> {
        if (result.isErr()) {
          return result;
        }
        return Ok(result.value * result.value);
      }

      const result1 = divide(10, 2);
      const squared1 = square(result1);
      
      expect(squared1.success).toBe(true);
      if (squared1.success) {
        expect(squared1.value).toBe(25);
      }

      const result2 = divide(10, 0);
      const squared2 = square(result2);
      
      expect(squared2.success).toBe(false);
      if (squared2.isErr()) {
        expect(squared2.error.message).toBe('Division by zero');
      }
    });

    it('should support async operations', async () => {
      async function asyncOperation(success: boolean): Promise<Result<string, Error>> {
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (success) {
          return Ok('async success');
        } else {
          return Err(new Error('async failure'));
        }
      }

      const successResult = await asyncOperation(true);
      expect(successResult.isOk()).toBe(true);
      if (successResult.isOk()) {
        expect(successResult.value).toBe('async success');
      }

      const errorResult = await asyncOperation(false);
      expect(errorResult.isErr()).toBe(true);
      if (errorResult.isErr()) {
        expect(errorResult.error.message).toBe('async failure');
      }
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct types', () => {
      // These should compile without TypeScript errors
      const stringResult: Result<string, Error> = Ok('string');
      const numberResult: Result<number, Error> = Ok(42);
      const objectResult: Result<{ prop: string }, Error> = Ok({ prop: 'value' });

      expect(stringResult.value).toBe('string');
      expect(numberResult.value).toBe(42);
      expect(objectResult.value?.prop).toBe('value');
    });

    it('should handle union types correctly', () => {
      type StringOrNumber = string | number;
      
      function processValue(value: StringOrNumber): Result<StringOrNumber, Error> {
        if (typeof value === 'string' && value.length === 0) {
          return Err(new Error('Empty string not allowed'));
        }
        return Ok(value);
      }

      const stringOk = processValue('hello');
      expect(stringOk.isOk()).toBe(true);
      if (stringOk.isOk()) {
        expect(typeof stringOk.value).toBe('string');
      }

      const stringErr = processValue('');
      expect(stringErr.isErr()).toBe(true);

      const numberOk = processValue(123);
      expect(numberOk.isOk()).toBe(true);
      if (numberOk.isOk()) {
        expect(typeof numberOk.value).toBe('number');
      }
    });
  });

  describe('Error Handling Patterns', () => {
    it('should provide useful error information', () => {
      class DetailedError extends Error {
        constructor(
          message: string,
          public code: string,
          public details?: Record<string, unknown>
        ) {
          super(message);
          this.name = 'DetailedError';
        }
      }

      function riskyOperation(input: unknown): Result<string, DetailedError> {
        if (typeof input !== 'string') {
          return Err(new DetailedError(
            'Invalid input type',
            'INVALID_TYPE',
            { received: typeof input, expected: 'string' }
          ));
        }
        
        if (input.length === 0) {
          return Err(new DetailedError(
            'Input cannot be empty',
            'EMPTY_INPUT'
          ));
        }

        return Ok(input.toUpperCase());
      }

      const result1 = riskyOperation('hello');
      expect(result1.isOk()).toBe(true);
      if (result1.isOk()) {
        expect(result1.value).toBe('HELLO');
      }

      const result2 = riskyOperation(123);
      expect(result2.isErr()).toBe(true);
      if (result2.isErr()) {
        expect(result2.error.code).toBe('INVALID_TYPE');
        expect(result2.error.details?.received).toBe('number');
      }

      const result3 = riskyOperation('');
      expect(result3.isErr()).toBe(true);
      if (result3.isErr()) {
        expect(result3.error.code).toBe('EMPTY_INPUT');
        expect(result3.error.details).toBeUndefined();
      }
    });

    it('should support error transformation', () => {
      function mapError<T, E1 extends Error, E2 extends Error>(
        result: Result<T, E1>,
        mapper: (error: E1) => E2
      ): Result<T, E2> {
        if (result.isErr()) {
          return Err(mapper(result.error));
        }
        return result;
      }

      const originalError = new Error('Original error');
      const errorResult: Result<string, Error> = Err(originalError);

      const mappedResult = mapError(errorResult, error => {
        const newError = new Error(`Mapped: ${error.message}`);
        newError.name = 'MappedError';
        return newError;
      });

      expect(mappedResult.isErr()).toBe(true);
      if (mappedResult.isErr()) {
        expect(mappedResult.error.message).toBe('Mapped: Original error');
        expect(mappedResult.error.name).toBe('MappedError');
      }
    });
  });
});