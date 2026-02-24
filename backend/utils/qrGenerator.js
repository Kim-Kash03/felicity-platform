const QRCode = require('qrcode');

/**
 * Generates a QR code as a base64 data URL
 * @param {string} data - the data to encode (e.g. ticketId or JSON)
 * @returns {Promise<string>} base64 data URL
 */
const generateQR = async (data) => {
    try {
        const url = await QRCode.toDataURL(String(data), {
            width: 256,
            margin: 2,
            color: {
                dark: '#140104ff',
                light: '#ffffff',
            },
        });
        return url;
    } catch (err) {
        console.error('QR generation error:', err);
        return null;
    }
};

module.exports = { generateQR };
