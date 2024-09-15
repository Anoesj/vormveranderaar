// Provide/inject injection keys

import type { InjectionKey } from 'vue';
import type { Puzzle } from '#build/types/nitro-imports';

export const showFiguresKey: InjectionKey<Ref<boolean>> = Symbol('showFigures');
export const doShowFiguresKey: InjectionKey<Ref<boolean>> = Symbol('doShowFigures');
export const resultKey: InjectionKey<Ref<Puzzle | undefined>> = Symbol('result');
export const isPrintingKey: InjectionKey<Ref<boolean>> = Symbol('isPrinting');
