import {
  deleteFileFromIndexedDb,
  fetchFromClientDb,
  logger,
  removeAction
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import "/public/assets/chunks/chunk-IJ3A6Q7E.js";
import "/public/assets/chunks/chunk-PN3BZAFX.js";
import "/public/assets/chunks/chunk-CILBJ2I2.js";
import "/public/assets/chunks/chunk-GQPLRP65.js";
import "/public/assets/chunks/chunk-UWXJIOEO.js";
import "/public/assets/chunks/chunk-TBNFSVJC.js";
import "/public/assets/chunks/chunk-SM3EH4JD.js";
import "/public/assets/chunks/chunk-JOOBQBMM.js";
import "/public/assets/chunks/chunk-7OO56Y7L.js";
import "/public/assets/chunks/chunk-NKT4VBPJ.js";
import "/public/assets/chunks/chunk-LPS7IE46.js";
import "/public/assets/chunks/chunk-RUG5F6GD.js";
import "/public/assets/chunks/chunk-XJRNNKKF.js";
import "/public/assets/chunks/chunk-IRTDRTXE.js";
import "/public/assets/chunks/chunk-XDKHKMJ3.js";
import "/public/assets/chunks/chunk-VCXOIOLL.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import "/public/assets/chunks/chunk-VU4ZNPEP.js";
import "/public/assets/chunks/chunk-3EHRYDZ6.js";
import "/public/assets/chunks/chunk-JXB3DLZU.js";
import "/public/assets/chunks/chunk-HYYCZJXV.js";
import "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/database/actions/deleteFile.ts
var deleteFileAction = async (dbKey, thunkApi) => {
  const { db: clientDb } = thunkApi.extra;
  try {
    const metadata = await fetchFromClientDb(clientDb, dbKey);
    if (metadata && metadata.id) {
      try {
        await deleteFileFromIndexedDb(metadata.id);
        logger.debug({ fileId: metadata.id }, "Deleted file blob from IndexedDB");
      } catch (err) {
        logger.warn({ err, fileId: metadata.id }, "Failed to delete file blob from IndexedDB, proceeding to delete metadata");
      }
    }
    await removeAction(dbKey, thunkApi);
  } catch (error) {
    logger.error({ error, dbKey }, "Failed to delete file completely");
    throw error;
  }
};
export {
  deleteFileAction
};
