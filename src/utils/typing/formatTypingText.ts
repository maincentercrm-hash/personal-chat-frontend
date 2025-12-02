/**
 * User who is currently typing
 */
export interface TypingUser {
  user_id: string;
  username?: string;
  display_name?: string;
}

/**
 * Format typing users into readable text
 *
 * @param typingUsers - Array of users who are typing
 * @returns Formatted typing text
 *
 * @example
 * formatTypingText([{user_id: '1', display_name: 'John'}])
 * // "John is typing..."
 *
 * formatTypingText([
 *   {user_id: '1', display_name: 'John'},
 *   {user_id: '2', display_name: 'Sarah'}
 * ])
 * // "John and Sarah are typing..."
 *
 * formatTypingText([
 *   {user_id: '1', display_name: 'John'},
 *   {user_id: '2', display_name: 'Sarah'},
 *   {user_id: '3', display_name: 'Mike'},
 *   {user_id: '4', display_name: 'Anna'}
 * ])
 * // "John, Sarah and 2 others are typing..."
 */
export const formatTypingText = (typingUsers: TypingUser[]): string => {
  if (!typingUsers || typingUsers.length === 0) {
    return '';
  }

  // Get display names, fallback to username, then to "Someone"
  const names = typingUsers.map(
    (user) => user.display_name || user.username || 'Someone'
  );

  // 1 user typing
  if (names.length === 1) {
    return `${names[0]} is typing...`;
  }

  // 2 users typing
  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing...`;
  }

  // 3+ users: Show first two and count others
  const firstTwo = names.slice(0, 2).join(', ');
  const remaining = names.length - 2;

  return `${firstTwo} and ${remaining} other${remaining > 1 ? 's' : ''} are typing...`;
};

/**
 * Format typing users into short format (for mobile)
 *
 * @param typingUsers - Array of users who are typing
 * @returns Short formatted typing text
 *
 * @example
 * formatTypingTextShort([{user_id: '1', display_name: 'John'}])
 * // "John..."
 *
 * formatTypingTextShort([
 *   {user_id: '1', display_name: 'John'},
 *   {user_id: '2', display_name: 'Sarah'}
 * ])
 * // "John, Sarah..."
 *
 * formatTypingTextShort([...5 users...])
 * // "5 people..."
 */
export const formatTypingTextShort = (typingUsers: TypingUser[]): string => {
  if (!typingUsers || typingUsers.length === 0) {
    return '';
  }

  const names = typingUsers.map(
    (user) => user.display_name || user.username || 'Someone'
  );

  // 1 user
  if (names.length === 1) {
    return `${names[0]}...`;
  }

  // 2 users
  if (names.length === 2) {
    return `${names[0]}, ${names[1]}...`;
  }

  // 3+ users: Just show count
  return `${names.length} people...`;
};

/**
 * Get first name from display name or username
 * Useful for showing short names in typing indicator
 *
 * @example
 * getFirstName('John Doe') // "John"
 * getFirstName('john_doe') // "john_doe"
 */
export const getFirstName = (name: string): string => {
  if (!name) return 'Someone';

  const parts = name.trim().split(/\s+/);
  return parts[0];
};
