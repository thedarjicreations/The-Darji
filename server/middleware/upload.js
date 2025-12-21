import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let uploader;
let deleter;

// ============== CLOUD STORAGE CONFIGURATION ==============
if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log('☁️ Using Cloud Storage (Cloudinary)');
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'the-darji-uploads',
            allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
            resource_type: 'image'
        }
    });

    uploader = multer({ storage: storage });

    deleter = async (imageUrl) => {
        if (!imageUrl) return;
        try {
            // Extract public_id from URL if possible, or just ignore since cloud doesn't need manual cleanup as much
            // Cloudinary deletion requires public_id, which is harder to get from just URL without storing it.
            // For now, we skip manual deletion on cloud or parse it if needed.
            console.log('Skipping manual delete for cloud image:', imageUrl);
        } catch (error) {
            console.error('Error deleting cloud image:', error);
        }
    };
}
// ============== LOCAL STORAGE CONFIGURATION ==============
else {
    console.log('💾 Using Local Storage');
    const uploadsDir = path.join(__dirname, '../../uploads');
    const requirementsDir = path.join(uploadsDir, 'requirements');
    const trialNotesDir = path.join(uploadsDir, 'trial-notes');

    [uploadsDir, requirementsDir, trialNotesDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            let uploadPath = requirementsDir;
            if (req.url.includes('trial-notes') || req.originalUrl.includes('trial-notes')) {
                uploadPath = trialNotesDir;
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, file.fieldname + '-' + uniqueSuffix + ext);
        }
    });

    const fileFilter = (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type.'), false);
    };

    uploader = multer({
        storage: storage,
        fileFilter: fileFilter,
        limits: { fileSize: 50 * 1024 * 1024 }
    });

    deleter = (imageUrl) => {
        if (!imageUrl) return;
        try {
            const filePath = path.join(__dirname, '../../', imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Deleted image: ${imageUrl}`);
            }
        } catch (error) {
            console.error('Error deleting image file:', error);
        }
    };
}

export const upload = uploader;
export const deleteImageFile = deleter;
