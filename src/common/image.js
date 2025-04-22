function bufferContainsScript(buffer) {
  const str = buffer.toString('utf8').toLowerCase();
  return (
    str.includes('<script') ||
    str.includes('javascript:') ||
    str.includes('<iframe') ||
    str.includes('onerror=') ||
    str.includes('<img') && str.includes('onload=')
  );
}

module.exports = {
  bufferContainsScript
};