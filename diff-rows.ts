import { distinct } from "https://deno.land/std@0.127.0/collections/mod.ts";

interface DiffRow<T> {
    s: null|T,
    d: null|T
}

export enum Type {
    Unchanged = 'unchanged',
    Changed = 'changed',
    New = 'new',
    Missing = 'missing'
}

type Schema = {[key: string]: string};

interface Result<T> {
    entry: T,
    type: Type,
    toString(): string;
}

export class DiffRows<T extends object> {
    private rows: Map<string, DiffRow<T>> = new Map<string, DiffRow<T>>();
    private addition: Set<string> = new Set<string>();
    private removal: Set<string> = new Set<string>();
    private unchanged: Set<string> = new Set<string>();
    private changed: Set<string> = new Set<string>();

    constructor(private makeKeySchema: (row: T) => Schema, private makeValueSchema: (row: T) => Schema) {}

    addSourceRow(row: T) {
        this.addRow('s', row);
    }

    addDestinationRow(row: T) {
        this.addRow('d', row);
    }

    private addRow(type: keyof DiffRow<T>, row: T) {
        const keySchema = this.makeKeySchema(row);
        const key = this.makeString(keySchema);

        if(!this.rows.has(key)) {
            this.rows.set(key, {s: null, d: null});
        }

        const entry = this.rows.get(key) ?? ({s: null, d: null} as DiffRow<T>);
        entry[type] = row;
        
        if(entry.s !== null && entry.d === null) {
            this.addToSet(this.addition, key);
        } else if(entry.s === null && entry.d !== null) {
            this.addToSet(this.removal, key);
        } else if(entry.s !== null && entry.d !== null) {
            const schemaA = this.makeValueSchema(entry.s);
            const hashA = this.makeString(schemaA);
            const schemaB = this.makeValueSchema(entry.d);
            const hashB = this.makeString(schemaB);
            if(hashA !== hashB) { // changed
                this.addToSet(this.changed, key);
            } else { // unchanged
                this.addToSet(this.unchanged, key);
            }
        }
    }

    public *receiveAll(...types: Type[]): Generator<Result<T>> {
        types = distinct(types);
        for(const type of types) {
            if(type === Type.Unchanged) {
                for(const key of this.unchanged) {
                    const entry: T = this.getEntry(key, entry => entry.s);
                    yield {
                        entry, 
                        type, 
                        toString() {
                            return `Unchanged ${Object.keys(entry).map(k => `${j(k)}: ${jk(entry, k)}`).join(', ')}`;
                        }
                    };
                }
            } else if(type === Type.Changed) {
                for(const key of this.changed) {
                    const entry = this.rows.get(key) as any as DiffRow<T>;
                    const entryS = entry.s as any as T;
                    const entryD = entry.d as any as T;
                    const keySchema = this.makeKeySchema(entryS)
                    const valueSchemaS = this.makeValueSchema(entryS);
                    const valueSchemaD = this.makeValueSchema(entryD);

                    yield {
                        entry: entry.s as any as T, 
                        type, 
                        toString() {
                            const keys = Object.keys(valueSchemaS);
                            const valueChanges = keys.filter(k => valueSchemaS[k] !== valueSchemaD[k]).map(k => `${j(k)}: ${jk(entryD, k)} => ${jk(entryS, k)}`);
                            return `Changed [${Object.keys(keySchema).map(k => `${j(k)}: ${jk(entryS, k)}`).join(', ')}] to [${valueChanges.join(', ')}]`;
                        }
                    };
                }
            } else if(type === Type.New) {
                for(const key of this.addition) {
                    const entry: T = this.getEntry(key, entry => entry.s);
                    yield {
                        entry, 
                        type, 
                        toString() {
                            return `New ${Object.keys(entry).map(k => `${j(k)}: ${jk(entry, k)}`).join(', ')}`;
                        }
                    };
                }
            } else if(type === Type.Missing) {
                for(const key of this.removal) {
                    const entry: T = this.getEntry(key, entry => entry.d);
                    yield {
                        entry, 
                        type, 
                        toString() {
                            return `Missing ${Object.keys(entry).map(k => `${j(k)}: ${jk(entry, k)}`).join(', ')}`;
                        }
                    };
                }
            }
        }

        function jk(obj: object, key: string): string {
            const map = new Map(Object.entries(obj));
            return JSON.stringify(map.get(key));
        }

        function j(v: any): string {
            return JSON.stringify(v);
        }
    }

    private makeString(keys: {[key: string]: string}) {
        return Object.values(keys)
            .map(x => x.replace(/\\/, '\\\\').replace(/\\/, '\\;'))
            .join(';');
    }
    
    private addToSet(set: Set<string>, key: string) {
        [this.changed, this.addition, this.unchanged, this.removal].filter(s => s !== set).forEach(s => s.delete(key));
        set.add(key);
    }

    private getEntry(key: string, conv: (x: DiffRow<T>) => null|T): T {
        const entry = this.rows.get(key);
        if(entry) {
            const value = conv(entry);
            if(value !== null) {
                return value;
            }
        }
        throw new Error();
    }
}
