import { Observable } from 'rxjs';
import { flatMap } from 'rxjs/operators';

/**
 * Cet opérateur permet de rendre un tableau d'objet en observable applati
 * Il a dont la même action que le from de rxjs mais en version opérateur
 */
export const fromOp = () => (source: Observable<any>) =>
  new Observable(observer => {
    return source.subscribe({
      next(x: []) {
        // On itère sur chaque élement du tableau
        for (const element of x) {
          // on emet une valeur pour chaque element
          observer.next(element);
        }
        observer.complete();
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
