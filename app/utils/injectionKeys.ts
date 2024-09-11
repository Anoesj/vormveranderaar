// Provide/inject injection keys

import type { InjectionKey } from 'vue';
import type { Puzzle } from '#build/types/nitro-imports';

export const showFiguresKey: InjectionKey<Ref<boolean>> = Symbol('showFigures');
export const resultKey: InjectionKey<Ref<Puzzle | undefined>> = Symbol('result');
