// import { Matrix } from "sylvester-es6";

declare global {
  interface Matrix {
    Translation(v: any): Matrix;
  }
}
