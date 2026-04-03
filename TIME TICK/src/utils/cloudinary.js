const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const uploadToCloudinary = (file, resourceType = 'image', onProgress, onAbort) => {
    return new Promise((resolve, reject) => {
        if (!CLOUD_NAME || !UPLOAD_PRESET) {
            reject(new Error('Cloudinary configuration missing'));
            return;
        }

        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        // Organize into folders
        const folder = resourceType === 'video' ? 'videos' : 'users'; // Saving in users folder
        formData.append('folder', folder);

        xhr.open('POST', url, true);

        // Expose abort function
        if (onAbort) {
            onAbort(() => {
                xhr.abort();
            });
        }

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    reject(new Error(error.error?.message || 'Upload failed'));
                } catch (e) {
                    reject(new Error('Upload failed'));
                }
            }
        };

        xhr.onabort = () => {
            reject(new Error('UserCancelled'));
        };

        xhr.onerror = () => reject(new Error('Network Error'));

        xhr.send(formData);
    });
};
