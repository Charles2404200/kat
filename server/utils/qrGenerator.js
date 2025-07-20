import QRCode from 'qrcode';

export async function generateQRCode(data) {
  try {
    return await QRCode.toDataURL(data);
  } catch (err) {
    console.error('QR Error:', err);
    return null;
  }
}
