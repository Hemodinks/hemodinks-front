export function readProfilePhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Nao foi possivel carregar a foto.'));
    };

    reader.onerror = () => reject(new Error('Nao foi possivel carregar a foto.'));
    reader.readAsDataURL(file);
  });
}
