describe('session configuration', () => {
  it('fails when SESSION_SECRET is missing', () => {
    const originalSecret = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    jest.resetModules();

    expect(() => {
      require('../src/lib/session');
    }).toThrow('SESSION_SECRET is required');

    if (originalSecret !== undefined) {
      process.env.SESSION_SECRET = originalSecret;
    }
  });
});
