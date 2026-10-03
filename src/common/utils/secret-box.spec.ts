import { decryptSecret, encryptSecret } from './secret-box';

describe('secret-box', () => {
  it('cifra y descifra; no se lee con otra llave ni si se altera', () => {
    const box = encryptSecret('abcd efgh ijkl mnop', 'llave-1');
    expect(box).not.toContain('abcd');
    expect(decryptSecret(box, 'llave-1')).toBe('abcd efgh ijkl mnop');
    expect(decryptSecret(box, 'llave-2')).toBeNull();
    expect(decryptSecret(box.slice(0, -2) + 'xx', 'llave-1')).toBeNull();
    expect(encryptSecret('x', 'k')).not.toBe(encryptSecret('x', 'k'));
  });
});
