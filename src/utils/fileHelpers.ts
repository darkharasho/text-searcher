export async function getFilesFromDataTransferItems(items: DataTransferItemList): Promise<File[]> {
    const files: File[] = [];
    const entries: FileSystemEntry[] = [];

    for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) {
            entries.push(entry);
        }
    }

    for (const entry of entries) {
        await scanEntry(entry, files);
    }

    return files;
}

async function scanEntry(entry: FileSystemEntry, files: File[]) {
    if (entry.isFile) {
        const file = await new Promise<File>((resolve, reject) => {
            (entry as FileSystemFileEntry).file(resolve, reject);
        });
        files.push(file);
    } else if (entry.isDirectory) {
        const dirReader = (entry as FileSystemDirectoryEntry).createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
        });
        for (const childEntry of entries) {
            await scanEntry(childEntry, files);
        }
    }
}
