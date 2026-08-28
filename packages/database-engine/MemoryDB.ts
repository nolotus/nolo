export interface BatchOp {
    type: "put" | "del";
    key: string;
    value?: any;
}

export class MemoryDB {
    private data = new Map<string, any>();

    async get(key: string): Promise<any> {
        if (this.data.has(key)) {
            return this.data.get(key);
        }
        throw new Error("NotFound");
    }

    async put(key: string, value: any): Promise<void> {
        this.data.set(key, value);
    }

    async del(key: string): Promise<void> {
        this.data.delete(key);
    }

    private async applyBatch(ops: BatchOp[]): Promise<void> {
        for (const op of ops) {
            if (op.type === "put") {
                this.data.set(op.key, op.value);
            } else {
                this.data.delete(op.key);
            }
        }
    }

    batch(ops?: BatchOp[]) {
        if (Array.isArray(ops)) {
            return this.applyBatch(ops);
        }

        const bufferedOps: BatchOp[] = [];
        return {
            put: (key: string, value: any) => {
                bufferedOps.push({ type: "put", key, value });
            },
            del: (key: string) => {
                bufferedOps.push({ type: "del", key });
            },
            write: async () => {
                await this.applyBatch(bufferedOps);
            },
        };
    }

    async *iterator(options: { gte?: string; lte?: string; lt?: string; reverse?: boolean } = {}): AsyncIterableIterator<[string, any]> {
        let keys = Array.from(this.data.keys()).sort();
        if (options.reverse) {
            keys.reverse();
        }

        for (const key of keys) {
            if (options.gte && key < options.gte) continue;
            if (options.lte && key > options.lte) continue;
            if (options.lt && key >= options.lt) continue;
            yield [key, this.data.get(key)] as [string, any];
        }
    }

    // Helper for tests
    dump() {
        return Object.fromEntries(this.data);
    }

    clear() {
        this.data.clear();
    }
}
