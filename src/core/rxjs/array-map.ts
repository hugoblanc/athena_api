import { Observable } from 'rxjs';
import { flatMap } from 'rxjs/operators';

export const fromOp = () => (source: Observable<any>) =>
  new Observable(observer => {
    return source.subscribe({
      next(x: []) {
        for (const element of x) {
          observer.next(element);
        }
      },
      error(err) { observer.error(err); },
      complete() { observer.complete(); },
    });
  });
/**
 * Cet operateur permet de transformer un tableau en liste d'observable qui souscrirons au prochain
 * obseravble automatiquement
 * @param inputArray un tableau d'objet en entré qui sera lissé
 */
// export const arrayMap = (project: (value: any, index: number) => Observable<any>) => { fromOp(), flatMap() };

export const arrayMap = (project: (value: any, index: number) => Observable<any>) => {

  return $input => $input.pipe(fromOp(), flatMap(project));
};
