import { describe, it, expect } from 'vitest';
import {
  formatTypingText,
  formatTypingTextShort,
  getFirstName,
  type TypingUser
} from './formatTypingText';

describe('formatTypingText', () => {
  it('should return empty string for empty array', () => {
    expect(formatTypingText([])).toBe('');
  });

  it('should return empty string for null/undefined', () => {
    expect(formatTypingText(null as any)).toBe('');
    expect(formatTypingText(undefined as any)).toBe('');
  });

  it('should format 1 user typing with display_name', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John Doe' }
    ];
    expect(formatTypingText(users)).toBe('John Doe is typing...');
  });

  it('should format 1 user typing with username fallback', () => {
    const users: TypingUser[] = [
      { user_id: '1', username: 'john_doe' }
    ];
    expect(formatTypingText(users)).toBe('john_doe is typing...');
  });

  it('should format 1 user typing with "Someone" fallback', () => {
    const users: TypingUser[] = [
      { user_id: '1' }
    ];
    expect(formatTypingText(users)).toBe('Someone is typing...');
  });

  it('should format 2 users typing', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John Doe' },
      { user_id: '2', display_name: 'Sarah Smith' }
    ];
    expect(formatTypingText(users)).toBe('John Doe and Sarah Smith are typing...');
  });

  it('should format 3 users typing', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John' },
      { user_id: '2', display_name: 'Sarah' },
      { user_id: '3', display_name: 'Mike' }
    ];
    expect(formatTypingText(users)).toBe('John, Sarah and 1 other are typing...');
  });

  it('should format 4+ users typing', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John' },
      { user_id: '2', display_name: 'Sarah' },
      { user_id: '3', display_name: 'Mike' },
      { user_id: '4', display_name: 'Anna' }
    ];
    expect(formatTypingText(users)).toBe('John, Sarah and 2 others are typing...');
  });

  it('should prioritize display_name over username', () => {
    const users: TypingUser[] = [
      { user_id: '1', username: 'john_doe', display_name: 'John Doe' }
    ];
    expect(formatTypingText(users)).toBe('John Doe is typing...');
  });
});

describe('formatTypingTextShort', () => {
  it('should return empty string for empty array', () => {
    expect(formatTypingTextShort([])).toBe('');
  });

  it('should format 1 user typing (short)', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John Doe' }
    ];
    expect(formatTypingTextShort(users)).toBe('John Doe...');
  });

  it('should format 2 users typing (short)', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John' },
      { user_id: '2', display_name: 'Sarah' }
    ];
    expect(formatTypingTextShort(users)).toBe('John, Sarah...');
  });

  it('should format 3+ users typing as count', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John' },
      { user_id: '2', display_name: 'Sarah' },
      { user_id: '3', display_name: 'Mike' }
    ];
    expect(formatTypingTextShort(users)).toBe('3 people...');
  });

  it('should format 5 users typing as count', () => {
    const users: TypingUser[] = [
      { user_id: '1', display_name: 'John' },
      { user_id: '2', display_name: 'Sarah' },
      { user_id: '3', display_name: 'Mike' },
      { user_id: '4', display_name: 'Anna' },
      { user_id: '5', display_name: 'Tom' }
    ];
    expect(formatTypingTextShort(users)).toBe('5 people...');
  });
});

describe('getFirstName', () => {
  it('should extract first name from full name', () => {
    expect(getFirstName('John Doe')).toBe('John');
    expect(getFirstName('Sarah Jane Smith')).toBe('Sarah');
  });

  it('should return full name if no space', () => {
    expect(getFirstName('John')).toBe('John');
    expect(getFirstName('john_doe')).toBe('john_doe');
  });

  it('should handle empty string', () => {
    expect(getFirstName('')).toBe('Someone');
  });

  it('should handle extra spaces', () => {
    expect(getFirstName('  John   Doe  ')).toBe('John');
  });
});
