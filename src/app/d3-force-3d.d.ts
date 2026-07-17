/**
 * Minimal type declarations for `d3-force-3d`, which ships none.
 *
 * This is a BUILD-TIME devDependency and never reaches a browser — `build-peta-3d.ts` solves the
 * cosmos layout once here so the client ships zero physics. These declarations therefore only
 * need to cover what that one file uses; they are not an attempt at complete d3 typings.
 *
 * A bare `declare module "d3-force-3d";` would type the whole module as `any`, which silently
 * turns `forceSimulation<ForceNode, ForceLinkDatum>(...)` into TS2347 ("untyped function calls
 * may not accept type arguments") and throws away typing at the boundary we care most about —
 * the one where a NaN coordinate would otherwise sail through into shipped data.
 */
declare module "d3-force-3d" {
  export interface Simulation<N, L> {
    numDimensions(n: number): Simulation<N, L>;
    randomSource(source: () => number): Simulation<N, L>;
    force(name: string, force: unknown): Simulation<N, L>;
    stop(): Simulation<N, L>;
    tick(iterations?: number): Simulation<N, L>;
    nodes(): N[];
  }

  export interface ManyBodyForce<N> {
    strength(fn: (node: N, i: number, nodes: N[]) => number): ManyBodyForce<N>;
  }

  export interface LinkForce<N, L> {
    id(fn: (node: N) => string): LinkForce<N, L>;
    /** By the time this runs, d3 has replaced the datum's `source`/`target` id strings with the
     * resolved node objects — hence the union. Reading it as a string is the bug that made the
     * hub-distance branch dead code. */
    distance(fn: (link: L) => number): LinkForce<N, L>;
    strength(value: number): LinkForce<N, L>;
  }

  export function forceSimulation<N, L>(nodes: N[]): Simulation<N, L>;
  export function forceManyBody<N>(): ManyBodyForce<N>;
  export function forceLink<N, L>(links: L[]): LinkForce<N, L>;
  export function forceCenter(x: number, y: number, z: number): unknown;
}
