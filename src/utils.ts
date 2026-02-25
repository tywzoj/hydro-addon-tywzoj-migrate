import { Schema } from "hydrooj";

export type ToSchema<T> =
    [T] extends [any[]]
    ? Schema<T>
    : [T] extends [object]
    ? { [K in keyof T]:
        [T[K]] extends [any[]]
        ? ToSchema<T[K]>
        : [T[K]] extends [object]
        ? Schema<ToSchema<T[K]>>
        : ToSchema<T[K]>
    }
    : Schema<T>;
