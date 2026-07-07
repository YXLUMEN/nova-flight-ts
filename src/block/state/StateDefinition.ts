import {StateHolder} from "./StateHolder.ts";
import {Property} from "./properties/Property.ts";
import {IllegalArgumentError} from "../../type/errors.ts";
import {cartesian} from "../../utils/math/math.ts";
import type {Comparable} from "../../type/Comparable.ts";
import type {Return} from "../../type/types.ts";

type Factory<O, S> = new (type: O, keys: Property<any>[], values: Comparable[]) => S;

export class StateDefinition<O, S extends StateHolder<O, S>> {
    private static readonly EMPTY_KEYS: Property<any>[] = [];
    private static readonly EMPTY_VALUES: Comparable[] = [];
    private static readonly EMPTY_NEIGHBORS: StateHolder<any, any>[][] = [[]];

    private readonly owner: O;
    private readonly properties: ReadonlyMap<string, Property<any>>;
    private readonly states: ReadonlyArray<S>;

    public constructor(_defaultState: Return<O, S>, owner: O, factory: Factory<O, S>, properties: Map<string, Property<any>>) {
        this.owner = owner;
        if (properties.size === 0) {
            this.properties = new Map();
            this.states = StateDefinition.createSingletonState(owner, factory);
        } else {
            this.properties = new Map(properties);
            if (properties.size === 1) {
                this.states = StateDefinition.createSinglePropertyStates(owner, factory, this.properties.values().next().value!);
            } else {
                this.states = StateDefinition.createMultiPropertyStates(owner, factory, this.properties);
            }
        }
    }

    public any(): S {
        return this.states[0];
    }

    public getPossibleStates(): readonly S[] {
        return this.states;
    }

    public getOwner(): O {
        return this.owner;
    }

    public getStates(): ReadonlyArray<S> {
        return this.states;
    }

    public getProperties(): MapIterator<Property<any>> {
        return this.properties.values();
    }

    public getProperty(name: string): Property<any> | null {
        return this.properties.get(name) ?? null;
    }

    public static builder<O, S extends StateHolder<O, S>>(owner: O): Builder<O, S> {
        return new Builder<O, S>(owner);
    }

    private static createSingletonState<O, S extends StateHolder<O, S>>(owner: O, factory: Factory<O, S>) {
        const instance = new factory(owner, this.EMPTY_KEYS, this.EMPTY_VALUES);
        instance.initializeNeighbors(this.EMPTY_NEIGHBORS as S[][]);
        return Object.freeze([instance]);
    }

    private static createSinglePropertyStates<O, S extends StateHolder<O, S>, T extends Comparable>(
        owner: O,
        factory: Factory<O, S>,
        property: Property<T>
    ) {
        const keys = [property];
        const values = property.getPossibleValues();
        const count = values.length;

        const states: S[] = [];
        const propertyNeighbours: S[] = new Array(count);
        const neighbours: S[][] = [propertyNeighbours];

        for (let i = 0; i < count; i++) {
            const value = values[i];
            if (property.getInternalIndex(value) !== i) throw new ReferenceError();

            const instance = new factory(owner, keys, [value]);
            states.push(instance);
            propertyNeighbours[i] = instance;
            instance.initializeNeighbors(neighbours);
        }

        return Object.freeze(states);
    }

    private static createMultiPropertyStates<O, S extends StateHolder<O, S>>(
        owner: O,
        factory: Factory<O, S>,
        properties: ReadonlyMap<string, Property<any>>
    ) {
        const keys: Property<any>[] = properties.values().toArray();
        const propertyValues: Comparable[][] = [];

        for (const property of properties.values()) {
            propertyValues.push(property.getPossibleValues());
        }

        const stateValues: Comparable[][] = cartesian(...propertyValues);
        const totalStates = stateValues.length;

        const strides = StateDefinition.computeStrides(propertyValues);
        const states: S[] = new Array(totalStates);

        for (let i = 0; i < totalStates; i++) {
            states[i] = new factory(owner, keys, Array.from(stateValues[i]));
        }

        const neighbors: S[][] = StateDefinition.buildSharedNeighbors(
            states,
            keys,
            propertyValues,
            strides
        );

        for (const state of states) {
            state.initializeNeighbors(neighbors);
        }

        return Object.freeze(states);
    }

    private static computeStrides(propertyValues: Comparable[][]): number[] {
        const count = propertyValues.length;
        const strides = new Array(count);
        let stride = 1;

        for (let i = count - 1; i >= 0; i--) {
            strides[i] = stride;
            stride *= propertyValues[i].length;
        }

        return strides;
    }

    private static buildSharedNeighbors<S extends StateHolder<any, S>>(
        states: S[],
        keys: Property<any>[],
        propertyValues: Comparable[][],
        strides: number[]
    ): S[][] {
        const propertyCount = keys.length;
        const neighbors: S[][] = new Array(propertyCount);

        for (let pIndex = 0; pIndex < propertyCount; pIndex++) {
            const valueCount = propertyValues[pIndex].length;
            const column: S[] = new Array(valueCount);
            const stride = strides[pIndex];

            for (let vIndex = 0; vIndex < valueCount; vIndex++) {
                column[vIndex] = states[vIndex * stride];
            }

            neighbors[pIndex] = column;
        }

        return neighbors;
    }
}

class Builder<O, S extends StateHolder<O, S>> {
    private static readonly NAME_PATTERN = /^[a-z0-9_]+$/;

    private readonly owner: O;
    private readonly properties: Map<string, Property<Comparable>> = new Map();

    public constructor(owner: O) {
        this.owner = owner;
    }

    public add(...properties: Property<Comparable>[]) {
        for (const property of properties) {
            this.validateProperty(property);
            this.properties.set(property.getName(), property);
        }
    }

    private validateProperty<T extends Comparable>(property: Property<T>): void {
        const name = property.getName();
        if (this.properties.has(name)) {
            throw new IllegalArgumentError(`${this.owner} has duplicate property: ${name}`);
        }

        const reg = Builder.NAME_PATTERN;
        if (!reg.test(name)) {
            throw new IllegalArgumentError(`${this.owner} has invalidly named property: ${name}`);
        }

        const values = property.getPossibleValues();
        if (values.length <= 1) {
            throw new IllegalArgumentError(`${this.owner} attempted use property ${name} with <= 1 possible values`);
        }

        for (const value of values) {
            const valueName = property.getValueName(value);
            if (!reg.test(valueName)) {
                throw new IllegalArgumentError(`${this.owner} has property: ${name} with invalidly named value: ${valueName}`);
            }
        }
    }

    public create(defaultState: Return<O, S>, factory: Factory<O, S>) {
        return new StateDefinition(defaultState, this.owner, factory, this.properties);
    }
}

export type StateDefinitionBuilder<O, S extends StateHolder<O, S>> = InstanceType<typeof Builder<O, S>>;