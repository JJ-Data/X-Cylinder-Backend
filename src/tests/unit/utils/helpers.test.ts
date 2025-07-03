import {
  generateRandomToken,
  isValidEmail,
  isValidUUID,
  slugify,
  capitalize,
  truncate,
} from '@utils/helpers';

describe('Helper Functions', () => {
  describe('generateRandomToken', () => {
    it('should generate a token of default length', () => {
      const token = generateRandomToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it('should generate a token of specified length', () => {
      const token = generateRandomToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special!@#Characters')).toBe('specialcharacters');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Short text', 20)).toBe('Short text');
      expect(truncate('This is a very long text', 10)).toBe('This is a ...');
    });
  });
});
