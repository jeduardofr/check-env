import { promises as fs } from 'fs';

export async function fileExists(path: string): Promise<boolean> {
	try {
		let stats = await fs.stat(path);
		if (stats.isFile()) {
			return true;
		}
	} catch (err) {
	}

	return false;
}
