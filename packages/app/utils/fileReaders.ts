// 文件路径: app/utils/fileReaders.ts
export function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("Failed to read file as data URL"));
        };
        reader.onerror = () => reject(reader.error || new Error("File read error"));
        reader.readAsDataURL(file);
    });
}