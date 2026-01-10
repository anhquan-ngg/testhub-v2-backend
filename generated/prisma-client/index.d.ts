
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Exam
 * 
 */
export type Exam = $Result.DefaultSelection<Prisma.$ExamPayload>
/**
 * Model Submission
 * 
 */
export type Submission = $Result.DefaultSelection<Prisma.$SubmissionPayload>
/**
 * Model Question
 * 
 */
export type Question = $Result.DefaultSelection<Prisma.$QuestionPayload>
/**
 * Model ExamQuestions
 * 
 */
export type ExamQuestions = $Result.DefaultSelection<Prisma.$ExamQuestionsPayload>
/**
 * Model SubmissionQuestions
 * 
 */
export type SubmissionQuestions = $Result.DefaultSelection<Prisma.$SubmissionQuestionsPayload>
/**
 * Model ExamRegistration
 * 
 */
export type ExamRegistration = $Result.DefaultSelection<Prisma.$ExamRegistrationPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  ADMIN: 'ADMIN',
  LECTURER: 'LECTURER',
  STUDENT: 'STUDENT'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const ExamStatus: {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
};

export type ExamStatus = (typeof ExamStatus)[keyof typeof ExamStatus]


export const RegistrationStatus: {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus]


export const QuestionType: {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  ESSAY: 'ESSAY'
};

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType]


export const QuestionFormat: {
  KNOWLEDGE: 'KNOWLEDGE',
  UNDERSTANDING: 'UNDERSTANDING',
  APPLYING: 'APPLYING',
  ADVANCED: 'ADVANCED'
};

export type QuestionFormat = (typeof QuestionFormat)[keyof typeof QuestionFormat]


export const SelectionMode: {
  MANUAL: 'MANUAL',
  RANDOM_N: 'RANDOM_N',
  BY_TYPE: 'BY_TYPE'
};

export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode]


export const Rating: {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  AVERAGE: 'AVERAGE',
  POOR: 'POOR'
};

export type Rating = (typeof Rating)[keyof typeof Rating]


export const SubmissionStatus: {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type ExamStatus = $Enums.ExamStatus

export const ExamStatus: typeof $Enums.ExamStatus

export type RegistrationStatus = $Enums.RegistrationStatus

export const RegistrationStatus: typeof $Enums.RegistrationStatus

export type QuestionType = $Enums.QuestionType

export const QuestionType: typeof $Enums.QuestionType

export type QuestionFormat = $Enums.QuestionFormat

export const QuestionFormat: typeof $Enums.QuestionFormat

export type SelectionMode = $Enums.SelectionMode

export const SelectionMode: typeof $Enums.SelectionMode

export type Rating = $Enums.Rating

export const Rating: typeof $Enums.Rating

export type SubmissionStatus = $Enums.SubmissionStatus

export const SubmissionStatus: typeof $Enums.SubmissionStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.exam`: Exposes CRUD operations for the **Exam** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Exams
    * const exams = await prisma.exam.findMany()
    * ```
    */
  get exam(): Prisma.ExamDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.submission`: Exposes CRUD operations for the **Submission** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Submissions
    * const submissions = await prisma.submission.findMany()
    * ```
    */
  get submission(): Prisma.SubmissionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.question`: Exposes CRUD operations for the **Question** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Questions
    * const questions = await prisma.question.findMany()
    * ```
    */
  get question(): Prisma.QuestionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.examQuestions`: Exposes CRUD operations for the **ExamQuestions** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExamQuestions
    * const examQuestions = await prisma.examQuestions.findMany()
    * ```
    */
  get examQuestions(): Prisma.ExamQuestionsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.submissionQuestions`: Exposes CRUD operations for the **SubmissionQuestions** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SubmissionQuestions
    * const submissionQuestions = await prisma.submissionQuestions.findMany()
    * ```
    */
  get submissionQuestions(): Prisma.SubmissionQuestionsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.examRegistration`: Exposes CRUD operations for the **ExamRegistration** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ExamRegistrations
    * const examRegistrations = await prisma.examRegistration.findMany()
    * ```
    */
  get examRegistration(): Prisma.ExamRegistrationDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.16.3
   * Query Engine version: bb420e667c1820a8c05a38023385f6cc7ef8e83a
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Exam: 'Exam',
    Submission: 'Submission',
    Question: 'Question',
    ExamQuestions: 'ExamQuestions',
    SubmissionQuestions: 'SubmissionQuestions',
    ExamRegistration: 'ExamRegistration'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "exam" | "submission" | "question" | "examQuestions" | "submissionQuestions" | "examRegistration"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Exam: {
        payload: Prisma.$ExamPayload<ExtArgs>
        fields: Prisma.ExamFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExamFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExamFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          findFirst: {
            args: Prisma.ExamFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExamFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          findMany: {
            args: Prisma.ExamFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>[]
          }
          create: {
            args: Prisma.ExamCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          createMany: {
            args: Prisma.ExamCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExamCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>[]
          }
          delete: {
            args: Prisma.ExamDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          update: {
            args: Prisma.ExamUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          deleteMany: {
            args: Prisma.ExamDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExamUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ExamUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>[]
          }
          upsert: {
            args: Prisma.ExamUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamPayload>
          }
          aggregate: {
            args: Prisma.ExamAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExam>
          }
          groupBy: {
            args: Prisma.ExamGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExamGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExamCountArgs<ExtArgs>
            result: $Utils.Optional<ExamCountAggregateOutputType> | number
          }
        }
      }
      Submission: {
        payload: Prisma.$SubmissionPayload<ExtArgs>
        fields: Prisma.SubmissionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubmissionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubmissionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findFirst: {
            args: Prisma.SubmissionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubmissionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          findMany: {
            args: Prisma.SubmissionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          create: {
            args: Prisma.SubmissionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          createMany: {
            args: Prisma.SubmissionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubmissionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          delete: {
            args: Prisma.SubmissionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          update: {
            args: Prisma.SubmissionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          deleteMany: {
            args: Prisma.SubmissionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubmissionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubmissionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>[]
          }
          upsert: {
            args: Prisma.SubmissionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionPayload>
          }
          aggregate: {
            args: Prisma.SubmissionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubmission>
          }
          groupBy: {
            args: Prisma.SubmissionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubmissionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubmissionCountArgs<ExtArgs>
            result: $Utils.Optional<SubmissionCountAggregateOutputType> | number
          }
        }
      }
      Question: {
        payload: Prisma.$QuestionPayload<ExtArgs>
        fields: Prisma.QuestionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.QuestionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.QuestionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          findFirst: {
            args: Prisma.QuestionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.QuestionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          findMany: {
            args: Prisma.QuestionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>[]
          }
          create: {
            args: Prisma.QuestionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          createMany: {
            args: Prisma.QuestionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.QuestionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>[]
          }
          delete: {
            args: Prisma.QuestionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          update: {
            args: Prisma.QuestionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          deleteMany: {
            args: Prisma.QuestionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.QuestionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.QuestionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>[]
          }
          upsert: {
            args: Prisma.QuestionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$QuestionPayload>
          }
          aggregate: {
            args: Prisma.QuestionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateQuestion>
          }
          groupBy: {
            args: Prisma.QuestionGroupByArgs<ExtArgs>
            result: $Utils.Optional<QuestionGroupByOutputType>[]
          }
          count: {
            args: Prisma.QuestionCountArgs<ExtArgs>
            result: $Utils.Optional<QuestionCountAggregateOutputType> | number
          }
        }
      }
      ExamQuestions: {
        payload: Prisma.$ExamQuestionsPayload<ExtArgs>
        fields: Prisma.ExamQuestionsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExamQuestionsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExamQuestionsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          findFirst: {
            args: Prisma.ExamQuestionsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExamQuestionsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          findMany: {
            args: Prisma.ExamQuestionsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>[]
          }
          create: {
            args: Prisma.ExamQuestionsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          createMany: {
            args: Prisma.ExamQuestionsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExamQuestionsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>[]
          }
          delete: {
            args: Prisma.ExamQuestionsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          update: {
            args: Prisma.ExamQuestionsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          deleteMany: {
            args: Prisma.ExamQuestionsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExamQuestionsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ExamQuestionsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>[]
          }
          upsert: {
            args: Prisma.ExamQuestionsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamQuestionsPayload>
          }
          aggregate: {
            args: Prisma.ExamQuestionsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExamQuestions>
          }
          groupBy: {
            args: Prisma.ExamQuestionsGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExamQuestionsGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExamQuestionsCountArgs<ExtArgs>
            result: $Utils.Optional<ExamQuestionsCountAggregateOutputType> | number
          }
        }
      }
      SubmissionQuestions: {
        payload: Prisma.$SubmissionQuestionsPayload<ExtArgs>
        fields: Prisma.SubmissionQuestionsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SubmissionQuestionsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SubmissionQuestionsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          findFirst: {
            args: Prisma.SubmissionQuestionsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SubmissionQuestionsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          findMany: {
            args: Prisma.SubmissionQuestionsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>[]
          }
          create: {
            args: Prisma.SubmissionQuestionsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          createMany: {
            args: Prisma.SubmissionQuestionsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SubmissionQuestionsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>[]
          }
          delete: {
            args: Prisma.SubmissionQuestionsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          update: {
            args: Prisma.SubmissionQuestionsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          deleteMany: {
            args: Prisma.SubmissionQuestionsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SubmissionQuestionsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SubmissionQuestionsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>[]
          }
          upsert: {
            args: Prisma.SubmissionQuestionsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SubmissionQuestionsPayload>
          }
          aggregate: {
            args: Prisma.SubmissionQuestionsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSubmissionQuestions>
          }
          groupBy: {
            args: Prisma.SubmissionQuestionsGroupByArgs<ExtArgs>
            result: $Utils.Optional<SubmissionQuestionsGroupByOutputType>[]
          }
          count: {
            args: Prisma.SubmissionQuestionsCountArgs<ExtArgs>
            result: $Utils.Optional<SubmissionQuestionsCountAggregateOutputType> | number
          }
        }
      }
      ExamRegistration: {
        payload: Prisma.$ExamRegistrationPayload<ExtArgs>
        fields: Prisma.ExamRegistrationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ExamRegistrationFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ExamRegistrationFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          findFirst: {
            args: Prisma.ExamRegistrationFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ExamRegistrationFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          findMany: {
            args: Prisma.ExamRegistrationFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>[]
          }
          create: {
            args: Prisma.ExamRegistrationCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          createMany: {
            args: Prisma.ExamRegistrationCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ExamRegistrationCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>[]
          }
          delete: {
            args: Prisma.ExamRegistrationDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          update: {
            args: Prisma.ExamRegistrationUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          deleteMany: {
            args: Prisma.ExamRegistrationDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ExamRegistrationUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ExamRegistrationUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>[]
          }
          upsert: {
            args: Prisma.ExamRegistrationUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ExamRegistrationPayload>
          }
          aggregate: {
            args: Prisma.ExamRegistrationAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateExamRegistration>
          }
          groupBy: {
            args: Prisma.ExamRegistrationGroupByArgs<ExtArgs>
            result: $Utils.Optional<ExamRegistrationGroupByOutputType>[]
          }
          count: {
            args: Prisma.ExamRegistrationCountArgs<ExtArgs>
            result: $Utils.Optional<ExamRegistrationCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    exam?: ExamOmit
    submission?: SubmissionOmit
    question?: QuestionOmit
    examQuestions?: ExamQuestionsOmit
    submissionQuestions?: SubmissionQuestionsOmit
    examRegistration?: ExamRegistrationOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    exams: number
    questions: number
    submissions: number
    registrations: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exams?: boolean | UserCountOutputTypeCountExamsArgs
    questions?: boolean | UserCountOutputTypeCountQuestionsArgs
    submissions?: boolean | UserCountOutputTypeCountSubmissionsArgs
    registrations?: boolean | UserCountOutputTypeCountRegistrationsArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountExamsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountQuestionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuestionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountRegistrationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamRegistrationWhereInput
  }


  /**
   * Count Type ExamCountOutputType
   */

  export type ExamCountOutputType = {
    submissions: number
    questions: number
    registrations: number
  }

  export type ExamCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submissions?: boolean | ExamCountOutputTypeCountSubmissionsArgs
    questions?: boolean | ExamCountOutputTypeCountQuestionsArgs
    registrations?: boolean | ExamCountOutputTypeCountRegistrationsArgs
  }

  // Custom InputTypes
  /**
   * ExamCountOutputType without action
   */
  export type ExamCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamCountOutputType
     */
    select?: ExamCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ExamCountOutputType without action
   */
  export type ExamCountOutputTypeCountSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
  }

  /**
   * ExamCountOutputType without action
   */
  export type ExamCountOutputTypeCountQuestionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamQuestionsWhereInput
  }

  /**
   * ExamCountOutputType without action
   */
  export type ExamCountOutputTypeCountRegistrationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamRegistrationWhereInput
  }


  /**
   * Count Type SubmissionCountOutputType
   */

  export type SubmissionCountOutputType = {
    questions: number
  }

  export type SubmissionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    questions?: boolean | SubmissionCountOutputTypeCountQuestionsArgs
  }

  // Custom InputTypes
  /**
   * SubmissionCountOutputType without action
   */
  export type SubmissionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionCountOutputType
     */
    select?: SubmissionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * SubmissionCountOutputType without action
   */
  export type SubmissionCountOutputTypeCountQuestionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionQuestionsWhereInput
  }


  /**
   * Count Type QuestionCountOutputType
   */

  export type QuestionCountOutputType = {
    submissions: number
    exams: number
  }

  export type QuestionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submissions?: boolean | QuestionCountOutputTypeCountSubmissionsArgs
    exams?: boolean | QuestionCountOutputTypeCountExamsArgs
  }

  // Custom InputTypes
  /**
   * QuestionCountOutputType without action
   */
  export type QuestionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the QuestionCountOutputType
     */
    select?: QuestionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * QuestionCountOutputType without action
   */
  export type QuestionCountOutputTypeCountSubmissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionQuestionsWhereInput
  }

  /**
   * QuestionCountOutputType without action
   */
  export type QuestionCountOutputTypeCountExamsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamQuestionsWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    full_name: string | null
    email: string | null
    password: string | null
    avatar_url: string | null
    role: $Enums.UserRole | null
    auth_provider: string | null
    provider_id: string | null
    school: string | null
    phone: string | null
    address: string | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    full_name: string | null
    email: string | null
    password: string | null
    avatar_url: string | null
    role: $Enums.UserRole | null
    auth_provider: string | null
    provider_id: string | null
    school: string | null
    phone: string | null
    address: string | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    full_name: number
    email: number
    password: number
    avatar_url: number
    role: number
    auth_provider: number
    provider_id: number
    school: number
    phone: number
    address: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    full_name?: true
    email?: true
    password?: true
    avatar_url?: true
    role?: true
    auth_provider?: true
    provider_id?: true
    school?: true
    phone?: true
    address?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    full_name?: true
    email?: true
    password?: true
    avatar_url?: true
    role?: true
    auth_provider?: true
    provider_id?: true
    school?: true
    phone?: true
    address?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    full_name?: true
    email?: true
    password?: true
    avatar_url?: true
    role?: true
    auth_provider?: true
    provider_id?: true
    school?: true
    phone?: true
    address?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    full_name: string
    email: string
    password: string
    avatar_url: string | null
    role: $Enums.UserRole
    auth_provider: string
    provider_id: string | null
    school: string | null
    phone: string | null
    address: string | null
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    full_name?: boolean
    email?: boolean
    password?: boolean
    avatar_url?: boolean
    role?: boolean
    auth_provider?: boolean
    provider_id?: boolean
    school?: boolean
    phone?: boolean
    address?: boolean
    exams?: boolean | User$examsArgs<ExtArgs>
    questions?: boolean | User$questionsArgs<ExtArgs>
    submissions?: boolean | User$submissionsArgs<ExtArgs>
    registrations?: boolean | User$registrationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    full_name?: boolean
    email?: boolean
    password?: boolean
    avatar_url?: boolean
    role?: boolean
    auth_provider?: boolean
    provider_id?: boolean
    school?: boolean
    phone?: boolean
    address?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    full_name?: boolean
    email?: boolean
    password?: boolean
    avatar_url?: boolean
    role?: boolean
    auth_provider?: boolean
    provider_id?: boolean
    school?: boolean
    phone?: boolean
    address?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    full_name?: boolean
    email?: boolean
    password?: boolean
    avatar_url?: boolean
    role?: boolean
    auth_provider?: boolean
    provider_id?: boolean
    school?: boolean
    phone?: boolean
    address?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "full_name" | "email" | "password" | "avatar_url" | "role" | "auth_provider" | "provider_id" | "school" | "phone" | "address", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exams?: boolean | User$examsArgs<ExtArgs>
    questions?: boolean | User$questionsArgs<ExtArgs>
    submissions?: boolean | User$submissionsArgs<ExtArgs>
    registrations?: boolean | User$registrationsArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      exams: Prisma.$ExamPayload<ExtArgs>[]
      questions: Prisma.$QuestionPayload<ExtArgs>[]
      submissions: Prisma.$SubmissionPayload<ExtArgs>[]
      registrations: Prisma.$ExamRegistrationPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      full_name: string
      email: string
      password: string
      avatar_url: string | null
      role: $Enums.UserRole
      auth_provider: string
      provider_id: string | null
      school: string | null
      phone: string | null
      address: string | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    exams<T extends User$examsArgs<ExtArgs> = {}>(args?: Subset<T, User$examsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    questions<T extends User$questionsArgs<ExtArgs> = {}>(args?: Subset<T, User$questionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    submissions<T extends User$submissionsArgs<ExtArgs> = {}>(args?: Subset<T, User$submissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    registrations<T extends User$registrationsArgs<ExtArgs> = {}>(args?: Subset<T, User$registrationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly created_at: FieldRef<"User", 'DateTime'>
    readonly updated_at: FieldRef<"User", 'DateTime'>
    readonly full_name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly avatar_url: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly auth_provider: FieldRef<"User", 'String'>
    readonly provider_id: FieldRef<"User", 'String'>
    readonly school: FieldRef<"User", 'String'>
    readonly phone: FieldRef<"User", 'String'>
    readonly address: FieldRef<"User", 'String'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.exams
   */
  export type User$examsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    where?: ExamWhereInput
    orderBy?: ExamOrderByWithRelationInput | ExamOrderByWithRelationInput[]
    cursor?: ExamWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExamScalarFieldEnum | ExamScalarFieldEnum[]
  }

  /**
   * User.questions
   */
  export type User$questionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    where?: QuestionWhereInput
    orderBy?: QuestionOrderByWithRelationInput | QuestionOrderByWithRelationInput[]
    cursor?: QuestionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: QuestionScalarFieldEnum | QuestionScalarFieldEnum[]
  }

  /**
   * User.submissions
   */
  export type User$submissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    cursor?: SubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * User.registrations
   */
  export type User$registrationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    where?: ExamRegistrationWhereInput
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    cursor?: ExamRegistrationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExamRegistrationScalarFieldEnum | ExamRegistrationScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Exam
   */

  export type AggregateExam = {
    _count: ExamCountAggregateOutputType | null
    _avg: ExamAvgAggregateOutputType | null
    _sum: ExamSumAggregateOutputType | null
    _min: ExamMinAggregateOutputType | null
    _max: ExamMaxAggregateOutputType | null
  }

  export type ExamAvgAggregateOutputType = {
    duration: number | null
    sample_size: number | null
  }

  export type ExamSumAggregateOutputType = {
    duration: number | null
    sample_size: number | null
  }

  export type ExamMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    lecturer_id: string | null
    topic: string | null
    title: string | null
    exam_start_time: Date | null
    exam_end_time: Date | null
    duration: number | null
    practice: boolean | null
    mode: $Enums.SelectionMode | null
    sample_size: number | null
    distribution: string | null
    is_public: boolean | null
    status: $Enums.ExamStatus | null
  }

  export type ExamMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    lecturer_id: string | null
    topic: string | null
    title: string | null
    exam_start_time: Date | null
    exam_end_time: Date | null
    duration: number | null
    practice: boolean | null
    mode: $Enums.SelectionMode | null
    sample_size: number | null
    distribution: string | null
    is_public: boolean | null
    status: $Enums.ExamStatus | null
  }

  export type ExamCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    lecturer_id: number
    topic: number
    title: number
    exam_start_time: number
    exam_end_time: number
    duration: number
    practice: number
    mode: number
    sample_size: number
    distribution: number
    is_public: number
    status: number
    _all: number
  }


  export type ExamAvgAggregateInputType = {
    duration?: true
    sample_size?: true
  }

  export type ExamSumAggregateInputType = {
    duration?: true
    sample_size?: true
  }

  export type ExamMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    topic?: true
    title?: true
    exam_start_time?: true
    exam_end_time?: true
    duration?: true
    practice?: true
    mode?: true
    sample_size?: true
    distribution?: true
    is_public?: true
    status?: true
  }

  export type ExamMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    topic?: true
    title?: true
    exam_start_time?: true
    exam_end_time?: true
    duration?: true
    practice?: true
    mode?: true
    sample_size?: true
    distribution?: true
    is_public?: true
    status?: true
  }

  export type ExamCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    topic?: true
    title?: true
    exam_start_time?: true
    exam_end_time?: true
    duration?: true
    practice?: true
    mode?: true
    sample_size?: true
    distribution?: true
    is_public?: true
    status?: true
    _all?: true
  }

  export type ExamAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Exam to aggregate.
     */
    where?: ExamWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Exams to fetch.
     */
    orderBy?: ExamOrderByWithRelationInput | ExamOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExamWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Exams from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Exams.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Exams
    **/
    _count?: true | ExamCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ExamAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ExamSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExamMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExamMaxAggregateInputType
  }

  export type GetExamAggregateType<T extends ExamAggregateArgs> = {
        [P in keyof T & keyof AggregateExam]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExam[P]>
      : GetScalarType<T[P], AggregateExam[P]>
  }




  export type ExamGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamWhereInput
    orderBy?: ExamOrderByWithAggregationInput | ExamOrderByWithAggregationInput[]
    by: ExamScalarFieldEnum[] | ExamScalarFieldEnum
    having?: ExamScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExamCountAggregateInputType | true
    _avg?: ExamAvgAggregateInputType
    _sum?: ExamSumAggregateInputType
    _min?: ExamMinAggregateInputType
    _max?: ExamMaxAggregateInputType
  }

  export type ExamGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date
    exam_end_time: Date
    duration: number
    practice: boolean
    mode: $Enums.SelectionMode
    sample_size: number | null
    distribution: string | null
    is_public: boolean
    status: $Enums.ExamStatus
    _count: ExamCountAggregateOutputType | null
    _avg: ExamAvgAggregateOutputType | null
    _sum: ExamSumAggregateOutputType | null
    _min: ExamMinAggregateOutputType | null
    _max: ExamMaxAggregateOutputType | null
  }

  type GetExamGroupByPayload<T extends ExamGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExamGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExamGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExamGroupByOutputType[P]>
            : GetScalarType<T[P], ExamGroupByOutputType[P]>
        }
      >
    >


  export type ExamSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    topic?: boolean
    title?: boolean
    exam_start_time?: boolean
    exam_end_time?: boolean
    duration?: boolean
    practice?: boolean
    mode?: boolean
    sample_size?: boolean
    distribution?: boolean
    is_public?: boolean
    status?: boolean
    submissions?: boolean | Exam$submissionsArgs<ExtArgs>
    questions?: boolean | Exam$questionsArgs<ExtArgs>
    registrations?: boolean | Exam$registrationsArgs<ExtArgs>
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ExamCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["exam"]>

  export type ExamSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    topic?: boolean
    title?: boolean
    exam_start_time?: boolean
    exam_end_time?: boolean
    duration?: boolean
    practice?: boolean
    mode?: boolean
    sample_size?: boolean
    distribution?: boolean
    is_public?: boolean
    status?: boolean
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["exam"]>

  export type ExamSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    topic?: boolean
    title?: boolean
    exam_start_time?: boolean
    exam_end_time?: boolean
    duration?: boolean
    practice?: boolean
    mode?: boolean
    sample_size?: boolean
    distribution?: boolean
    is_public?: boolean
    status?: boolean
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["exam"]>

  export type ExamSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    topic?: boolean
    title?: boolean
    exam_start_time?: boolean
    exam_end_time?: boolean
    duration?: boolean
    practice?: boolean
    mode?: boolean
    sample_size?: boolean
    distribution?: boolean
    is_public?: boolean
    status?: boolean
  }

  export type ExamOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "lecturer_id" | "topic" | "title" | "exam_start_time" | "exam_end_time" | "duration" | "practice" | "mode" | "sample_size" | "distribution" | "is_public" | "status", ExtArgs["result"]["exam"]>
  export type ExamInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submissions?: boolean | Exam$submissionsArgs<ExtArgs>
    questions?: boolean | Exam$questionsArgs<ExtArgs>
    registrations?: boolean | Exam$registrationsArgs<ExtArgs>
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | ExamCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ExamIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ExamIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ExamPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Exam"
    objects: {
      submissions: Prisma.$SubmissionPayload<ExtArgs>[]
      questions: Prisma.$ExamQuestionsPayload<ExtArgs>[]
      registrations: Prisma.$ExamRegistrationPayload<ExtArgs>[]
      lecturer: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      lecturer_id: string
      topic: string
      title: string
      exam_start_time: Date
      exam_end_time: Date
      duration: number
      practice: boolean
      mode: $Enums.SelectionMode
      sample_size: number | null
      distribution: string | null
      is_public: boolean
      status: $Enums.ExamStatus
    }, ExtArgs["result"]["exam"]>
    composites: {}
  }

  type ExamGetPayload<S extends boolean | null | undefined | ExamDefaultArgs> = $Result.GetResult<Prisma.$ExamPayload, S>

  type ExamCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ExamFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ExamCountAggregateInputType | true
    }

  export interface ExamDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Exam'], meta: { name: 'Exam' } }
    /**
     * Find zero or one Exam that matches the filter.
     * @param {ExamFindUniqueArgs} args - Arguments to find a Exam
     * @example
     * // Get one Exam
     * const exam = await prisma.exam.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExamFindUniqueArgs>(args: SelectSubset<T, ExamFindUniqueArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Exam that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ExamFindUniqueOrThrowArgs} args - Arguments to find a Exam
     * @example
     * // Get one Exam
     * const exam = await prisma.exam.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExamFindUniqueOrThrowArgs>(args: SelectSubset<T, ExamFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Exam that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamFindFirstArgs} args - Arguments to find a Exam
     * @example
     * // Get one Exam
     * const exam = await prisma.exam.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExamFindFirstArgs>(args?: SelectSubset<T, ExamFindFirstArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Exam that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamFindFirstOrThrowArgs} args - Arguments to find a Exam
     * @example
     * // Get one Exam
     * const exam = await prisma.exam.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExamFindFirstOrThrowArgs>(args?: SelectSubset<T, ExamFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Exams that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Exams
     * const exams = await prisma.exam.findMany()
     * 
     * // Get first 10 Exams
     * const exams = await prisma.exam.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const examWithIdOnly = await prisma.exam.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExamFindManyArgs>(args?: SelectSubset<T, ExamFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Exam.
     * @param {ExamCreateArgs} args - Arguments to create a Exam.
     * @example
     * // Create one Exam
     * const Exam = await prisma.exam.create({
     *   data: {
     *     // ... data to create a Exam
     *   }
     * })
     * 
     */
    create<T extends ExamCreateArgs>(args: SelectSubset<T, ExamCreateArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Exams.
     * @param {ExamCreateManyArgs} args - Arguments to create many Exams.
     * @example
     * // Create many Exams
     * const exam = await prisma.exam.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExamCreateManyArgs>(args?: SelectSubset<T, ExamCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Exams and returns the data saved in the database.
     * @param {ExamCreateManyAndReturnArgs} args - Arguments to create many Exams.
     * @example
     * // Create many Exams
     * const exam = await prisma.exam.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Exams and only return the `id`
     * const examWithIdOnly = await prisma.exam.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ExamCreateManyAndReturnArgs>(args?: SelectSubset<T, ExamCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Exam.
     * @param {ExamDeleteArgs} args - Arguments to delete one Exam.
     * @example
     * // Delete one Exam
     * const Exam = await prisma.exam.delete({
     *   where: {
     *     // ... filter to delete one Exam
     *   }
     * })
     * 
     */
    delete<T extends ExamDeleteArgs>(args: SelectSubset<T, ExamDeleteArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Exam.
     * @param {ExamUpdateArgs} args - Arguments to update one Exam.
     * @example
     * // Update one Exam
     * const exam = await prisma.exam.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExamUpdateArgs>(args: SelectSubset<T, ExamUpdateArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Exams.
     * @param {ExamDeleteManyArgs} args - Arguments to filter Exams to delete.
     * @example
     * // Delete a few Exams
     * const { count } = await prisma.exam.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExamDeleteManyArgs>(args?: SelectSubset<T, ExamDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Exams.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Exams
     * const exam = await prisma.exam.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExamUpdateManyArgs>(args: SelectSubset<T, ExamUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Exams and returns the data updated in the database.
     * @param {ExamUpdateManyAndReturnArgs} args - Arguments to update many Exams.
     * @example
     * // Update many Exams
     * const exam = await prisma.exam.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Exams and only return the `id`
     * const examWithIdOnly = await prisma.exam.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ExamUpdateManyAndReturnArgs>(args: SelectSubset<T, ExamUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Exam.
     * @param {ExamUpsertArgs} args - Arguments to update or create a Exam.
     * @example
     * // Update or create a Exam
     * const exam = await prisma.exam.upsert({
     *   create: {
     *     // ... data to create a Exam
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Exam we want to update
     *   }
     * })
     */
    upsert<T extends ExamUpsertArgs>(args: SelectSubset<T, ExamUpsertArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Exams.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamCountArgs} args - Arguments to filter Exams to count.
     * @example
     * // Count the number of Exams
     * const count = await prisma.exam.count({
     *   where: {
     *     // ... the filter for the Exams we want to count
     *   }
     * })
    **/
    count<T extends ExamCountArgs>(
      args?: Subset<T, ExamCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExamCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Exam.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExamAggregateArgs>(args: Subset<T, ExamAggregateArgs>): Prisma.PrismaPromise<GetExamAggregateType<T>>

    /**
     * Group by Exam.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExamGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExamGroupByArgs['orderBy'] }
        : { orderBy?: ExamGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExamGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExamGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Exam model
   */
  readonly fields: ExamFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Exam.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExamClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    submissions<T extends Exam$submissionsArgs<ExtArgs> = {}>(args?: Subset<T, Exam$submissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    questions<T extends Exam$questionsArgs<ExtArgs> = {}>(args?: Subset<T, Exam$questionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    registrations<T extends Exam$registrationsArgs<ExtArgs> = {}>(args?: Subset<T, Exam$registrationsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    lecturer<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Exam model
   */
  interface ExamFieldRefs {
    readonly id: FieldRef<"Exam", 'String'>
    readonly created_at: FieldRef<"Exam", 'DateTime'>
    readonly updated_at: FieldRef<"Exam", 'DateTime'>
    readonly lecturer_id: FieldRef<"Exam", 'String'>
    readonly topic: FieldRef<"Exam", 'String'>
    readonly title: FieldRef<"Exam", 'String'>
    readonly exam_start_time: FieldRef<"Exam", 'DateTime'>
    readonly exam_end_time: FieldRef<"Exam", 'DateTime'>
    readonly duration: FieldRef<"Exam", 'Int'>
    readonly practice: FieldRef<"Exam", 'Boolean'>
    readonly mode: FieldRef<"Exam", 'SelectionMode'>
    readonly sample_size: FieldRef<"Exam", 'Int'>
    readonly distribution: FieldRef<"Exam", 'String'>
    readonly is_public: FieldRef<"Exam", 'Boolean'>
    readonly status: FieldRef<"Exam", 'ExamStatus'>
  }
    

  // Custom InputTypes
  /**
   * Exam findUnique
   */
  export type ExamFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter, which Exam to fetch.
     */
    where: ExamWhereUniqueInput
  }

  /**
   * Exam findUniqueOrThrow
   */
  export type ExamFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter, which Exam to fetch.
     */
    where: ExamWhereUniqueInput
  }

  /**
   * Exam findFirst
   */
  export type ExamFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter, which Exam to fetch.
     */
    where?: ExamWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Exams to fetch.
     */
    orderBy?: ExamOrderByWithRelationInput | ExamOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Exams.
     */
    cursor?: ExamWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Exams from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Exams.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Exams.
     */
    distinct?: ExamScalarFieldEnum | ExamScalarFieldEnum[]
  }

  /**
   * Exam findFirstOrThrow
   */
  export type ExamFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter, which Exam to fetch.
     */
    where?: ExamWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Exams to fetch.
     */
    orderBy?: ExamOrderByWithRelationInput | ExamOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Exams.
     */
    cursor?: ExamWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Exams from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Exams.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Exams.
     */
    distinct?: ExamScalarFieldEnum | ExamScalarFieldEnum[]
  }

  /**
   * Exam findMany
   */
  export type ExamFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter, which Exams to fetch.
     */
    where?: ExamWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Exams to fetch.
     */
    orderBy?: ExamOrderByWithRelationInput | ExamOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Exams.
     */
    cursor?: ExamWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Exams from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Exams.
     */
    skip?: number
    distinct?: ExamScalarFieldEnum | ExamScalarFieldEnum[]
  }

  /**
   * Exam create
   */
  export type ExamCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * The data needed to create a Exam.
     */
    data: XOR<ExamCreateInput, ExamUncheckedCreateInput>
  }

  /**
   * Exam createMany
   */
  export type ExamCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Exams.
     */
    data: ExamCreateManyInput | ExamCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Exam createManyAndReturn
   */
  export type ExamCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * The data used to create many Exams.
     */
    data: ExamCreateManyInput | ExamCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Exam update
   */
  export type ExamUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * The data needed to update a Exam.
     */
    data: XOR<ExamUpdateInput, ExamUncheckedUpdateInput>
    /**
     * Choose, which Exam to update.
     */
    where: ExamWhereUniqueInput
  }

  /**
   * Exam updateMany
   */
  export type ExamUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Exams.
     */
    data: XOR<ExamUpdateManyMutationInput, ExamUncheckedUpdateManyInput>
    /**
     * Filter which Exams to update
     */
    where?: ExamWhereInput
    /**
     * Limit how many Exams to update.
     */
    limit?: number
  }

  /**
   * Exam updateManyAndReturn
   */
  export type ExamUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * The data used to update Exams.
     */
    data: XOR<ExamUpdateManyMutationInput, ExamUncheckedUpdateManyInput>
    /**
     * Filter which Exams to update
     */
    where?: ExamWhereInput
    /**
     * Limit how many Exams to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Exam upsert
   */
  export type ExamUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * The filter to search for the Exam to update in case it exists.
     */
    where: ExamWhereUniqueInput
    /**
     * In case the Exam found by the `where` argument doesn't exist, create a new Exam with this data.
     */
    create: XOR<ExamCreateInput, ExamUncheckedCreateInput>
    /**
     * In case the Exam was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExamUpdateInput, ExamUncheckedUpdateInput>
  }

  /**
   * Exam delete
   */
  export type ExamDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
    /**
     * Filter which Exam to delete.
     */
    where: ExamWhereUniqueInput
  }

  /**
   * Exam deleteMany
   */
  export type ExamDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Exams to delete
     */
    where?: ExamWhereInput
    /**
     * Limit how many Exams to delete.
     */
    limit?: number
  }

  /**
   * Exam.submissions
   */
  export type Exam$submissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    cursor?: SubmissionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Exam.questions
   */
  export type Exam$questionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    where?: ExamQuestionsWhereInput
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    cursor?: ExamQuestionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExamQuestionsScalarFieldEnum | ExamQuestionsScalarFieldEnum[]
  }

  /**
   * Exam.registrations
   */
  export type Exam$registrationsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    where?: ExamRegistrationWhereInput
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    cursor?: ExamRegistrationWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExamRegistrationScalarFieldEnum | ExamRegistrationScalarFieldEnum[]
  }

  /**
   * Exam without action
   */
  export type ExamDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Exam
     */
    select?: ExamSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Exam
     */
    omit?: ExamOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamInclude<ExtArgs> | null
  }


  /**
   * Model Submission
   */

  export type AggregateSubmission = {
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  export type SubmissionAvgAggregateOutputType = {
    total_score: Decimal | null
  }

  export type SubmissionSumAggregateOutputType = {
    total_score: Decimal | null
  }

  export type SubmissionMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    student_id: string | null
    total_score: Decimal | null
    rating: $Enums.Rating | null
    start_time: Date | null
    end_time: Date | null
    status: $Enums.SubmissionStatus | null
  }

  export type SubmissionMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    student_id: string | null
    total_score: Decimal | null
    rating: $Enums.Rating | null
    start_time: Date | null
    end_time: Date | null
    status: $Enums.SubmissionStatus | null
  }

  export type SubmissionCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    exam_id: number
    student_id: number
    total_score: number
    rating: number
    start_time: number
    end_time: number
    status: number
    _all: number
  }


  export type SubmissionAvgAggregateInputType = {
    total_score?: true
  }

  export type SubmissionSumAggregateInputType = {
    total_score?: true
  }

  export type SubmissionMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    total_score?: true
    rating?: true
    start_time?: true
    end_time?: true
    status?: true
  }

  export type SubmissionMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    total_score?: true
    rating?: true
    start_time?: true
    end_time?: true
    status?: true
  }

  export type SubmissionCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    total_score?: true
    rating?: true
    start_time?: true
    end_time?: true
    status?: true
    _all?: true
  }

  export type SubmissionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Submission to aggregate.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Submissions
    **/
    _count?: true | SubmissionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubmissionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubmissionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubmissionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubmissionMaxAggregateInputType
  }

  export type GetSubmissionAggregateType<T extends SubmissionAggregateArgs> = {
        [P in keyof T & keyof AggregateSubmission]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubmission[P]>
      : GetScalarType<T[P], AggregateSubmission[P]>
  }




  export type SubmissionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionWhereInput
    orderBy?: SubmissionOrderByWithAggregationInput | SubmissionOrderByWithAggregationInput[]
    by: SubmissionScalarFieldEnum[] | SubmissionScalarFieldEnum
    having?: SubmissionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubmissionCountAggregateInputType | true
    _avg?: SubmissionAvgAggregateInputType
    _sum?: SubmissionSumAggregateInputType
    _min?: SubmissionMinAggregateInputType
    _max?: SubmissionMaxAggregateInputType
  }

  export type SubmissionGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    exam_id: string
    student_id: string
    total_score: Decimal | null
    rating: $Enums.Rating | null
    start_time: Date | null
    end_time: Date | null
    status: $Enums.SubmissionStatus
    _count: SubmissionCountAggregateOutputType | null
    _avg: SubmissionAvgAggregateOutputType | null
    _sum: SubmissionSumAggregateOutputType | null
    _min: SubmissionMinAggregateOutputType | null
    _max: SubmissionMaxAggregateOutputType | null
  }

  type GetSubmissionGroupByPayload<T extends SubmissionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubmissionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubmissionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
            : GetScalarType<T[P], SubmissionGroupByOutputType[P]>
        }
      >
    >


  export type SubmissionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    total_score?: boolean
    rating?: boolean
    start_time?: boolean
    end_time?: boolean
    status?: boolean
    questions?: boolean | Submission$questionsArgs<ExtArgs>
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | SubmissionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    total_score?: boolean
    rating?: boolean
    start_time?: boolean
    end_time?: boolean
    status?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    total_score?: boolean
    rating?: boolean
    start_time?: boolean
    end_time?: boolean
    status?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submission"]>

  export type SubmissionSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    total_score?: boolean
    rating?: boolean
    start_time?: boolean
    end_time?: boolean
    status?: boolean
  }

  export type SubmissionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "exam_id" | "student_id" | "total_score" | "rating" | "start_time" | "end_time" | "status", ExtArgs["result"]["submission"]>
  export type SubmissionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    questions?: boolean | Submission$questionsArgs<ExtArgs>
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | SubmissionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type SubmissionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type SubmissionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SubmissionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Submission"
    objects: {
      questions: Prisma.$SubmissionQuestionsPayload<ExtArgs>[]
      exam: Prisma.$ExamPayload<ExtArgs>
      student: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      exam_id: string
      student_id: string
      total_score: Prisma.Decimal | null
      rating: $Enums.Rating | null
      start_time: Date | null
      end_time: Date | null
      status: $Enums.SubmissionStatus
    }, ExtArgs["result"]["submission"]>
    composites: {}
  }

  type SubmissionGetPayload<S extends boolean | null | undefined | SubmissionDefaultArgs> = $Result.GetResult<Prisma.$SubmissionPayload, S>

  type SubmissionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubmissionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubmissionCountAggregateInputType | true
    }

  export interface SubmissionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Submission'], meta: { name: 'Submission' } }
    /**
     * Find zero or one Submission that matches the filter.
     * @param {SubmissionFindUniqueArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubmissionFindUniqueArgs>(args: SelectSubset<T, SubmissionFindUniqueArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Submission that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubmissionFindUniqueOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubmissionFindUniqueOrThrowArgs>(args: SelectSubset<T, SubmissionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Submission that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubmissionFindFirstArgs>(args?: SelectSubset<T, SubmissionFindFirstArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Submission that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindFirstOrThrowArgs} args - Arguments to find a Submission
     * @example
     * // Get one Submission
     * const submission = await prisma.submission.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubmissionFindFirstOrThrowArgs>(args?: SelectSubset<T, SubmissionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Submissions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Submissions
     * const submissions = await prisma.submission.findMany()
     * 
     * // Get first 10 Submissions
     * const submissions = await prisma.submission.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const submissionWithIdOnly = await prisma.submission.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubmissionFindManyArgs>(args?: SelectSubset<T, SubmissionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Submission.
     * @param {SubmissionCreateArgs} args - Arguments to create a Submission.
     * @example
     * // Create one Submission
     * const Submission = await prisma.submission.create({
     *   data: {
     *     // ... data to create a Submission
     *   }
     * })
     * 
     */
    create<T extends SubmissionCreateArgs>(args: SelectSubset<T, SubmissionCreateArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Submissions.
     * @param {SubmissionCreateManyArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubmissionCreateManyArgs>(args?: SelectSubset<T, SubmissionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Submissions and returns the data saved in the database.
     * @param {SubmissionCreateManyAndReturnArgs} args - Arguments to create many Submissions.
     * @example
     * // Create many Submissions
     * const submission = await prisma.submission.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Submissions and only return the `id`
     * const submissionWithIdOnly = await prisma.submission.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubmissionCreateManyAndReturnArgs>(args?: SelectSubset<T, SubmissionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Submission.
     * @param {SubmissionDeleteArgs} args - Arguments to delete one Submission.
     * @example
     * // Delete one Submission
     * const Submission = await prisma.submission.delete({
     *   where: {
     *     // ... filter to delete one Submission
     *   }
     * })
     * 
     */
    delete<T extends SubmissionDeleteArgs>(args: SelectSubset<T, SubmissionDeleteArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Submission.
     * @param {SubmissionUpdateArgs} args - Arguments to update one Submission.
     * @example
     * // Update one Submission
     * const submission = await prisma.submission.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubmissionUpdateArgs>(args: SelectSubset<T, SubmissionUpdateArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Submissions.
     * @param {SubmissionDeleteManyArgs} args - Arguments to filter Submissions to delete.
     * @example
     * // Delete a few Submissions
     * const { count } = await prisma.submission.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubmissionDeleteManyArgs>(args?: SelectSubset<T, SubmissionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Submissions
     * const submission = await prisma.submission.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubmissionUpdateManyArgs>(args: SelectSubset<T, SubmissionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Submissions and returns the data updated in the database.
     * @param {SubmissionUpdateManyAndReturnArgs} args - Arguments to update many Submissions.
     * @example
     * // Update many Submissions
     * const submission = await prisma.submission.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Submissions and only return the `id`
     * const submissionWithIdOnly = await prisma.submission.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubmissionUpdateManyAndReturnArgs>(args: SelectSubset<T, SubmissionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Submission.
     * @param {SubmissionUpsertArgs} args - Arguments to update or create a Submission.
     * @example
     * // Update or create a Submission
     * const submission = await prisma.submission.upsert({
     *   create: {
     *     // ... data to create a Submission
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Submission we want to update
     *   }
     * })
     */
    upsert<T extends SubmissionUpsertArgs>(args: SelectSubset<T, SubmissionUpsertArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Submissions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionCountArgs} args - Arguments to filter Submissions to count.
     * @example
     * // Count the number of Submissions
     * const count = await prisma.submission.count({
     *   where: {
     *     // ... the filter for the Submissions we want to count
     *   }
     * })
    **/
    count<T extends SubmissionCountArgs>(
      args?: Subset<T, SubmissionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubmissionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubmissionAggregateArgs>(args: Subset<T, SubmissionAggregateArgs>): Prisma.PrismaPromise<GetSubmissionAggregateType<T>>

    /**
     * Group by Submission.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubmissionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubmissionGroupByArgs['orderBy'] }
        : { orderBy?: SubmissionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubmissionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubmissionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Submission model
   */
  readonly fields: SubmissionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Submission.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubmissionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    questions<T extends Submission$questionsArgs<ExtArgs> = {}>(args?: Subset<T, Submission$questionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    exam<T extends ExamDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ExamDefaultArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    student<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Submission model
   */
  interface SubmissionFieldRefs {
    readonly id: FieldRef<"Submission", 'String'>
    readonly created_at: FieldRef<"Submission", 'DateTime'>
    readonly updated_at: FieldRef<"Submission", 'DateTime'>
    readonly exam_id: FieldRef<"Submission", 'String'>
    readonly student_id: FieldRef<"Submission", 'String'>
    readonly total_score: FieldRef<"Submission", 'Decimal'>
    readonly rating: FieldRef<"Submission", 'Rating'>
    readonly start_time: FieldRef<"Submission", 'DateTime'>
    readonly end_time: FieldRef<"Submission", 'DateTime'>
    readonly status: FieldRef<"Submission", 'SubmissionStatus'>
  }
    

  // Custom InputTypes
  /**
   * Submission findUnique
   */
  export type SubmissionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findUniqueOrThrow
   */
  export type SubmissionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission findFirst
   */
  export type SubmissionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findFirstOrThrow
   */
  export type SubmissionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submission to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Submissions.
     */
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission findMany
   */
  export type SubmissionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter, which Submissions to fetch.
     */
    where?: SubmissionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Submissions to fetch.
     */
    orderBy?: SubmissionOrderByWithRelationInput | SubmissionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Submissions.
     */
    cursor?: SubmissionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Submissions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Submissions.
     */
    skip?: number
    distinct?: SubmissionScalarFieldEnum | SubmissionScalarFieldEnum[]
  }

  /**
   * Submission create
   */
  export type SubmissionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The data needed to create a Submission.
     */
    data: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
  }

  /**
   * Submission createMany
   */
  export type SubmissionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Submission createManyAndReturn
   */
  export type SubmissionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * The data used to create many Submissions.
     */
    data: SubmissionCreateManyInput | SubmissionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Submission update
   */
  export type SubmissionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The data needed to update a Submission.
     */
    data: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
    /**
     * Choose, which Submission to update.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission updateMany
   */
  export type SubmissionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Submissions.
     */
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyInput>
    /**
     * Filter which Submissions to update
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to update.
     */
    limit?: number
  }

  /**
   * Submission updateManyAndReturn
   */
  export type SubmissionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * The data used to update Submissions.
     */
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyInput>
    /**
     * Filter which Submissions to update
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Submission upsert
   */
  export type SubmissionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * The filter to search for the Submission to update in case it exists.
     */
    where: SubmissionWhereUniqueInput
    /**
     * In case the Submission found by the `where` argument doesn't exist, create a new Submission with this data.
     */
    create: XOR<SubmissionCreateInput, SubmissionUncheckedCreateInput>
    /**
     * In case the Submission was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubmissionUpdateInput, SubmissionUncheckedUpdateInput>
  }

  /**
   * Submission delete
   */
  export type SubmissionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
    /**
     * Filter which Submission to delete.
     */
    where: SubmissionWhereUniqueInput
  }

  /**
   * Submission deleteMany
   */
  export type SubmissionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Submissions to delete
     */
    where?: SubmissionWhereInput
    /**
     * Limit how many Submissions to delete.
     */
    limit?: number
  }

  /**
   * Submission.questions
   */
  export type Submission$questionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    where?: SubmissionQuestionsWhereInput
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    cursor?: SubmissionQuestionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionQuestionsScalarFieldEnum | SubmissionQuestionsScalarFieldEnum[]
  }

  /**
   * Submission without action
   */
  export type SubmissionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Submission
     */
    select?: SubmissionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Submission
     */
    omit?: SubmissionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionInclude<ExtArgs> | null
  }


  /**
   * Model Question
   */

  export type AggregateQuestion = {
    _count: QuestionCountAggregateOutputType | null
    _min: QuestionMinAggregateOutputType | null
    _max: QuestionMaxAggregateOutputType | null
  }

  export type QuestionMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    lecturer_id: string | null
    question_text: string | null
    topic: string | null
    options: string | null
    correct_answer: string | null
    image_url: string | null
    question_type: $Enums.QuestionType | null
    question_format: $Enums.QuestionFormat | null
  }

  export type QuestionMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    lecturer_id: string | null
    question_text: string | null
    topic: string | null
    options: string | null
    correct_answer: string | null
    image_url: string | null
    question_type: $Enums.QuestionType | null
    question_format: $Enums.QuestionFormat | null
  }

  export type QuestionCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    lecturer_id: number
    question_text: number
    topic: number
    options: number
    correct_answer: number
    image_url: number
    question_type: number
    question_format: number
    _all: number
  }


  export type QuestionMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    question_text?: true
    topic?: true
    options?: true
    correct_answer?: true
    image_url?: true
    question_type?: true
    question_format?: true
  }

  export type QuestionMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    question_text?: true
    topic?: true
    options?: true
    correct_answer?: true
    image_url?: true
    question_type?: true
    question_format?: true
  }

  export type QuestionCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    lecturer_id?: true
    question_text?: true
    topic?: true
    options?: true
    correct_answer?: true
    image_url?: true
    question_type?: true
    question_format?: true
    _all?: true
  }

  export type QuestionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Question to aggregate.
     */
    where?: QuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Questions to fetch.
     */
    orderBy?: QuestionOrderByWithRelationInput | QuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: QuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Questions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Questions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Questions
    **/
    _count?: true | QuestionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: QuestionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: QuestionMaxAggregateInputType
  }

  export type GetQuestionAggregateType<T extends QuestionAggregateArgs> = {
        [P in keyof T & keyof AggregateQuestion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateQuestion[P]>
      : GetScalarType<T[P], AggregateQuestion[P]>
  }




  export type QuestionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: QuestionWhereInput
    orderBy?: QuestionOrderByWithAggregationInput | QuestionOrderByWithAggregationInput[]
    by: QuestionScalarFieldEnum[] | QuestionScalarFieldEnum
    having?: QuestionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: QuestionCountAggregateInputType | true
    _min?: QuestionMinAggregateInputType
    _max?: QuestionMaxAggregateInputType
  }

  export type QuestionGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    lecturer_id: string
    question_text: string
    topic: string
    options: string | null
    correct_answer: string | null
    image_url: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    _count: QuestionCountAggregateOutputType | null
    _min: QuestionMinAggregateOutputType | null
    _max: QuestionMaxAggregateOutputType | null
  }

  type GetQuestionGroupByPayload<T extends QuestionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<QuestionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof QuestionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], QuestionGroupByOutputType[P]>
            : GetScalarType<T[P], QuestionGroupByOutputType[P]>
        }
      >
    >


  export type QuestionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    question_text?: boolean
    topic?: boolean
    options?: boolean
    correct_answer?: boolean
    image_url?: boolean
    question_type?: boolean
    question_format?: boolean
    submissions?: boolean | Question$submissionsArgs<ExtArgs>
    exams?: boolean | Question$examsArgs<ExtArgs>
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | QuestionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["question"]>

  export type QuestionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    question_text?: boolean
    topic?: boolean
    options?: boolean
    correct_answer?: boolean
    image_url?: boolean
    question_type?: boolean
    question_format?: boolean
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["question"]>

  export type QuestionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    question_text?: boolean
    topic?: boolean
    options?: boolean
    correct_answer?: boolean
    image_url?: boolean
    question_type?: boolean
    question_format?: boolean
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["question"]>

  export type QuestionSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    lecturer_id?: boolean
    question_text?: boolean
    topic?: boolean
    options?: boolean
    correct_answer?: boolean
    image_url?: boolean
    question_type?: boolean
    question_format?: boolean
  }

  export type QuestionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "lecturer_id" | "question_text" | "topic" | "options" | "correct_answer" | "image_url" | "question_type" | "question_format", ExtArgs["result"]["question"]>
  export type QuestionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submissions?: boolean | Question$submissionsArgs<ExtArgs>
    exams?: boolean | Question$examsArgs<ExtArgs>
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
    _count?: boolean | QuestionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type QuestionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type QuestionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    lecturer?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $QuestionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Question"
    objects: {
      submissions: Prisma.$SubmissionQuestionsPayload<ExtArgs>[]
      exams: Prisma.$ExamQuestionsPayload<ExtArgs>[]
      lecturer: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      lecturer_id: string
      question_text: string
      topic: string
      options: string | null
      correct_answer: string | null
      image_url: string | null
      question_type: $Enums.QuestionType
      question_format: $Enums.QuestionFormat
    }, ExtArgs["result"]["question"]>
    composites: {}
  }

  type QuestionGetPayload<S extends boolean | null | undefined | QuestionDefaultArgs> = $Result.GetResult<Prisma.$QuestionPayload, S>

  type QuestionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<QuestionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: QuestionCountAggregateInputType | true
    }

  export interface QuestionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Question'], meta: { name: 'Question' } }
    /**
     * Find zero or one Question that matches the filter.
     * @param {QuestionFindUniqueArgs} args - Arguments to find a Question
     * @example
     * // Get one Question
     * const question = await prisma.question.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends QuestionFindUniqueArgs>(args: SelectSubset<T, QuestionFindUniqueArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Question that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {QuestionFindUniqueOrThrowArgs} args - Arguments to find a Question
     * @example
     * // Get one Question
     * const question = await prisma.question.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends QuestionFindUniqueOrThrowArgs>(args: SelectSubset<T, QuestionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Question that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionFindFirstArgs} args - Arguments to find a Question
     * @example
     * // Get one Question
     * const question = await prisma.question.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends QuestionFindFirstArgs>(args?: SelectSubset<T, QuestionFindFirstArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Question that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionFindFirstOrThrowArgs} args - Arguments to find a Question
     * @example
     * // Get one Question
     * const question = await prisma.question.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends QuestionFindFirstOrThrowArgs>(args?: SelectSubset<T, QuestionFindFirstOrThrowArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Questions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Questions
     * const questions = await prisma.question.findMany()
     * 
     * // Get first 10 Questions
     * const questions = await prisma.question.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const questionWithIdOnly = await prisma.question.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends QuestionFindManyArgs>(args?: SelectSubset<T, QuestionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Question.
     * @param {QuestionCreateArgs} args - Arguments to create a Question.
     * @example
     * // Create one Question
     * const Question = await prisma.question.create({
     *   data: {
     *     // ... data to create a Question
     *   }
     * })
     * 
     */
    create<T extends QuestionCreateArgs>(args: SelectSubset<T, QuestionCreateArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Questions.
     * @param {QuestionCreateManyArgs} args - Arguments to create many Questions.
     * @example
     * // Create many Questions
     * const question = await prisma.question.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends QuestionCreateManyArgs>(args?: SelectSubset<T, QuestionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Questions and returns the data saved in the database.
     * @param {QuestionCreateManyAndReturnArgs} args - Arguments to create many Questions.
     * @example
     * // Create many Questions
     * const question = await prisma.question.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Questions and only return the `id`
     * const questionWithIdOnly = await prisma.question.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends QuestionCreateManyAndReturnArgs>(args?: SelectSubset<T, QuestionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Question.
     * @param {QuestionDeleteArgs} args - Arguments to delete one Question.
     * @example
     * // Delete one Question
     * const Question = await prisma.question.delete({
     *   where: {
     *     // ... filter to delete one Question
     *   }
     * })
     * 
     */
    delete<T extends QuestionDeleteArgs>(args: SelectSubset<T, QuestionDeleteArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Question.
     * @param {QuestionUpdateArgs} args - Arguments to update one Question.
     * @example
     * // Update one Question
     * const question = await prisma.question.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends QuestionUpdateArgs>(args: SelectSubset<T, QuestionUpdateArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Questions.
     * @param {QuestionDeleteManyArgs} args - Arguments to filter Questions to delete.
     * @example
     * // Delete a few Questions
     * const { count } = await prisma.question.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends QuestionDeleteManyArgs>(args?: SelectSubset<T, QuestionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Questions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Questions
     * const question = await prisma.question.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends QuestionUpdateManyArgs>(args: SelectSubset<T, QuestionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Questions and returns the data updated in the database.
     * @param {QuestionUpdateManyAndReturnArgs} args - Arguments to update many Questions.
     * @example
     * // Update many Questions
     * const question = await prisma.question.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Questions and only return the `id`
     * const questionWithIdOnly = await prisma.question.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends QuestionUpdateManyAndReturnArgs>(args: SelectSubset<T, QuestionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Question.
     * @param {QuestionUpsertArgs} args - Arguments to update or create a Question.
     * @example
     * // Update or create a Question
     * const question = await prisma.question.upsert({
     *   create: {
     *     // ... data to create a Question
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Question we want to update
     *   }
     * })
     */
    upsert<T extends QuestionUpsertArgs>(args: SelectSubset<T, QuestionUpsertArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Questions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionCountArgs} args - Arguments to filter Questions to count.
     * @example
     * // Count the number of Questions
     * const count = await prisma.question.count({
     *   where: {
     *     // ... the filter for the Questions we want to count
     *   }
     * })
    **/
    count<T extends QuestionCountArgs>(
      args?: Subset<T, QuestionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], QuestionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Question.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends QuestionAggregateArgs>(args: Subset<T, QuestionAggregateArgs>): Prisma.PrismaPromise<GetQuestionAggregateType<T>>

    /**
     * Group by Question.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {QuestionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends QuestionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: QuestionGroupByArgs['orderBy'] }
        : { orderBy?: QuestionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, QuestionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetQuestionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Question model
   */
  readonly fields: QuestionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Question.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__QuestionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    submissions<T extends Question$submissionsArgs<ExtArgs> = {}>(args?: Subset<T, Question$submissionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    exams<T extends Question$examsArgs<ExtArgs> = {}>(args?: Subset<T, Question$examsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    lecturer<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Question model
   */
  interface QuestionFieldRefs {
    readonly id: FieldRef<"Question", 'String'>
    readonly created_at: FieldRef<"Question", 'DateTime'>
    readonly updated_at: FieldRef<"Question", 'DateTime'>
    readonly lecturer_id: FieldRef<"Question", 'String'>
    readonly question_text: FieldRef<"Question", 'String'>
    readonly topic: FieldRef<"Question", 'String'>
    readonly options: FieldRef<"Question", 'String'>
    readonly correct_answer: FieldRef<"Question", 'String'>
    readonly image_url: FieldRef<"Question", 'String'>
    readonly question_type: FieldRef<"Question", 'QuestionType'>
    readonly question_format: FieldRef<"Question", 'QuestionFormat'>
  }
    

  // Custom InputTypes
  /**
   * Question findUnique
   */
  export type QuestionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter, which Question to fetch.
     */
    where: QuestionWhereUniqueInput
  }

  /**
   * Question findUniqueOrThrow
   */
  export type QuestionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter, which Question to fetch.
     */
    where: QuestionWhereUniqueInput
  }

  /**
   * Question findFirst
   */
  export type QuestionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter, which Question to fetch.
     */
    where?: QuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Questions to fetch.
     */
    orderBy?: QuestionOrderByWithRelationInput | QuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Questions.
     */
    cursor?: QuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Questions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Questions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Questions.
     */
    distinct?: QuestionScalarFieldEnum | QuestionScalarFieldEnum[]
  }

  /**
   * Question findFirstOrThrow
   */
  export type QuestionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter, which Question to fetch.
     */
    where?: QuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Questions to fetch.
     */
    orderBy?: QuestionOrderByWithRelationInput | QuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Questions.
     */
    cursor?: QuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Questions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Questions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Questions.
     */
    distinct?: QuestionScalarFieldEnum | QuestionScalarFieldEnum[]
  }

  /**
   * Question findMany
   */
  export type QuestionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter, which Questions to fetch.
     */
    where?: QuestionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Questions to fetch.
     */
    orderBy?: QuestionOrderByWithRelationInput | QuestionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Questions.
     */
    cursor?: QuestionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Questions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Questions.
     */
    skip?: number
    distinct?: QuestionScalarFieldEnum | QuestionScalarFieldEnum[]
  }

  /**
   * Question create
   */
  export type QuestionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * The data needed to create a Question.
     */
    data: XOR<QuestionCreateInput, QuestionUncheckedCreateInput>
  }

  /**
   * Question createMany
   */
  export type QuestionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Questions.
     */
    data: QuestionCreateManyInput | QuestionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Question createManyAndReturn
   */
  export type QuestionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * The data used to create many Questions.
     */
    data: QuestionCreateManyInput | QuestionCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Question update
   */
  export type QuestionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * The data needed to update a Question.
     */
    data: XOR<QuestionUpdateInput, QuestionUncheckedUpdateInput>
    /**
     * Choose, which Question to update.
     */
    where: QuestionWhereUniqueInput
  }

  /**
   * Question updateMany
   */
  export type QuestionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Questions.
     */
    data: XOR<QuestionUpdateManyMutationInput, QuestionUncheckedUpdateManyInput>
    /**
     * Filter which Questions to update
     */
    where?: QuestionWhereInput
    /**
     * Limit how many Questions to update.
     */
    limit?: number
  }

  /**
   * Question updateManyAndReturn
   */
  export type QuestionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * The data used to update Questions.
     */
    data: XOR<QuestionUpdateManyMutationInput, QuestionUncheckedUpdateManyInput>
    /**
     * Filter which Questions to update
     */
    where?: QuestionWhereInput
    /**
     * Limit how many Questions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Question upsert
   */
  export type QuestionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * The filter to search for the Question to update in case it exists.
     */
    where: QuestionWhereUniqueInput
    /**
     * In case the Question found by the `where` argument doesn't exist, create a new Question with this data.
     */
    create: XOR<QuestionCreateInput, QuestionUncheckedCreateInput>
    /**
     * In case the Question was found with the provided `where` argument, update it with this data.
     */
    update: XOR<QuestionUpdateInput, QuestionUncheckedUpdateInput>
  }

  /**
   * Question delete
   */
  export type QuestionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
    /**
     * Filter which Question to delete.
     */
    where: QuestionWhereUniqueInput
  }

  /**
   * Question deleteMany
   */
  export type QuestionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Questions to delete
     */
    where?: QuestionWhereInput
    /**
     * Limit how many Questions to delete.
     */
    limit?: number
  }

  /**
   * Question.submissions
   */
  export type Question$submissionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    where?: SubmissionQuestionsWhereInput
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    cursor?: SubmissionQuestionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SubmissionQuestionsScalarFieldEnum | SubmissionQuestionsScalarFieldEnum[]
  }

  /**
   * Question.exams
   */
  export type Question$examsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    where?: ExamQuestionsWhereInput
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    cursor?: ExamQuestionsWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ExamQuestionsScalarFieldEnum | ExamQuestionsScalarFieldEnum[]
  }

  /**
   * Question without action
   */
  export type QuestionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Question
     */
    select?: QuestionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Question
     */
    omit?: QuestionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: QuestionInclude<ExtArgs> | null
  }


  /**
   * Model ExamQuestions
   */

  export type AggregateExamQuestions = {
    _count: ExamQuestionsCountAggregateOutputType | null
    _min: ExamQuestionsMinAggregateOutputType | null
    _max: ExamQuestionsMaxAggregateOutputType | null
  }

  export type ExamQuestionsMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    question_id: string | null
  }

  export type ExamQuestionsMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    question_id: string | null
  }

  export type ExamQuestionsCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    exam_id: number
    question_id: number
    _all: number
  }


  export type ExamQuestionsMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    question_id?: true
  }

  export type ExamQuestionsMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    question_id?: true
  }

  export type ExamQuestionsCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    question_id?: true
    _all?: true
  }

  export type ExamQuestionsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExamQuestions to aggregate.
     */
    where?: ExamQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamQuestions to fetch.
     */
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExamQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExamQuestions
    **/
    _count?: true | ExamQuestionsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExamQuestionsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExamQuestionsMaxAggregateInputType
  }

  export type GetExamQuestionsAggregateType<T extends ExamQuestionsAggregateArgs> = {
        [P in keyof T & keyof AggregateExamQuestions]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExamQuestions[P]>
      : GetScalarType<T[P], AggregateExamQuestions[P]>
  }




  export type ExamQuestionsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamQuestionsWhereInput
    orderBy?: ExamQuestionsOrderByWithAggregationInput | ExamQuestionsOrderByWithAggregationInput[]
    by: ExamQuestionsScalarFieldEnum[] | ExamQuestionsScalarFieldEnum
    having?: ExamQuestionsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExamQuestionsCountAggregateInputType | true
    _min?: ExamQuestionsMinAggregateInputType
    _max?: ExamQuestionsMaxAggregateInputType
  }

  export type ExamQuestionsGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    exam_id: string
    question_id: string
    _count: ExamQuestionsCountAggregateOutputType | null
    _min: ExamQuestionsMinAggregateOutputType | null
    _max: ExamQuestionsMaxAggregateOutputType | null
  }

  type GetExamQuestionsGroupByPayload<T extends ExamQuestionsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExamQuestionsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExamQuestionsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExamQuestionsGroupByOutputType[P]>
            : GetScalarType<T[P], ExamQuestionsGroupByOutputType[P]>
        }
      >
    >


  export type ExamQuestionsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    question_id?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examQuestions"]>

  export type ExamQuestionsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    question_id?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examQuestions"]>

  export type ExamQuestionsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    question_id?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examQuestions"]>

  export type ExamQuestionsSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    question_id?: boolean
  }

  export type ExamQuestionsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "exam_id" | "question_id", ExtArgs["result"]["examQuestions"]>
  export type ExamQuestionsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }
  export type ExamQuestionsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }
  export type ExamQuestionsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }

  export type $ExamQuestionsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExamQuestions"
    objects: {
      exam: Prisma.$ExamPayload<ExtArgs>
      question: Prisma.$QuestionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      exam_id: string
      question_id: string
    }, ExtArgs["result"]["examQuestions"]>
    composites: {}
  }

  type ExamQuestionsGetPayload<S extends boolean | null | undefined | ExamQuestionsDefaultArgs> = $Result.GetResult<Prisma.$ExamQuestionsPayload, S>

  type ExamQuestionsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ExamQuestionsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ExamQuestionsCountAggregateInputType | true
    }

  export interface ExamQuestionsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExamQuestions'], meta: { name: 'ExamQuestions' } }
    /**
     * Find zero or one ExamQuestions that matches the filter.
     * @param {ExamQuestionsFindUniqueArgs} args - Arguments to find a ExamQuestions
     * @example
     * // Get one ExamQuestions
     * const examQuestions = await prisma.examQuestions.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExamQuestionsFindUniqueArgs>(args: SelectSubset<T, ExamQuestionsFindUniqueArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ExamQuestions that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ExamQuestionsFindUniqueOrThrowArgs} args - Arguments to find a ExamQuestions
     * @example
     * // Get one ExamQuestions
     * const examQuestions = await prisma.examQuestions.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExamQuestionsFindUniqueOrThrowArgs>(args: SelectSubset<T, ExamQuestionsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExamQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsFindFirstArgs} args - Arguments to find a ExamQuestions
     * @example
     * // Get one ExamQuestions
     * const examQuestions = await prisma.examQuestions.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExamQuestionsFindFirstArgs>(args?: SelectSubset<T, ExamQuestionsFindFirstArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExamQuestions that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsFindFirstOrThrowArgs} args - Arguments to find a ExamQuestions
     * @example
     * // Get one ExamQuestions
     * const examQuestions = await prisma.examQuestions.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExamQuestionsFindFirstOrThrowArgs>(args?: SelectSubset<T, ExamQuestionsFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ExamQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExamQuestions
     * const examQuestions = await prisma.examQuestions.findMany()
     * 
     * // Get first 10 ExamQuestions
     * const examQuestions = await prisma.examQuestions.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const examQuestionsWithIdOnly = await prisma.examQuestions.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExamQuestionsFindManyArgs>(args?: SelectSubset<T, ExamQuestionsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ExamQuestions.
     * @param {ExamQuestionsCreateArgs} args - Arguments to create a ExamQuestions.
     * @example
     * // Create one ExamQuestions
     * const ExamQuestions = await prisma.examQuestions.create({
     *   data: {
     *     // ... data to create a ExamQuestions
     *   }
     * })
     * 
     */
    create<T extends ExamQuestionsCreateArgs>(args: SelectSubset<T, ExamQuestionsCreateArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ExamQuestions.
     * @param {ExamQuestionsCreateManyArgs} args - Arguments to create many ExamQuestions.
     * @example
     * // Create many ExamQuestions
     * const examQuestions = await prisma.examQuestions.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExamQuestionsCreateManyArgs>(args?: SelectSubset<T, ExamQuestionsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ExamQuestions and returns the data saved in the database.
     * @param {ExamQuestionsCreateManyAndReturnArgs} args - Arguments to create many ExamQuestions.
     * @example
     * // Create many ExamQuestions
     * const examQuestions = await prisma.examQuestions.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ExamQuestions and only return the `id`
     * const examQuestionsWithIdOnly = await prisma.examQuestions.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ExamQuestionsCreateManyAndReturnArgs>(args?: SelectSubset<T, ExamQuestionsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ExamQuestions.
     * @param {ExamQuestionsDeleteArgs} args - Arguments to delete one ExamQuestions.
     * @example
     * // Delete one ExamQuestions
     * const ExamQuestions = await prisma.examQuestions.delete({
     *   where: {
     *     // ... filter to delete one ExamQuestions
     *   }
     * })
     * 
     */
    delete<T extends ExamQuestionsDeleteArgs>(args: SelectSubset<T, ExamQuestionsDeleteArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ExamQuestions.
     * @param {ExamQuestionsUpdateArgs} args - Arguments to update one ExamQuestions.
     * @example
     * // Update one ExamQuestions
     * const examQuestions = await prisma.examQuestions.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExamQuestionsUpdateArgs>(args: SelectSubset<T, ExamQuestionsUpdateArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ExamQuestions.
     * @param {ExamQuestionsDeleteManyArgs} args - Arguments to filter ExamQuestions to delete.
     * @example
     * // Delete a few ExamQuestions
     * const { count } = await prisma.examQuestions.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExamQuestionsDeleteManyArgs>(args?: SelectSubset<T, ExamQuestionsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExamQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExamQuestions
     * const examQuestions = await prisma.examQuestions.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExamQuestionsUpdateManyArgs>(args: SelectSubset<T, ExamQuestionsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExamQuestions and returns the data updated in the database.
     * @param {ExamQuestionsUpdateManyAndReturnArgs} args - Arguments to update many ExamQuestions.
     * @example
     * // Update many ExamQuestions
     * const examQuestions = await prisma.examQuestions.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ExamQuestions and only return the `id`
     * const examQuestionsWithIdOnly = await prisma.examQuestions.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ExamQuestionsUpdateManyAndReturnArgs>(args: SelectSubset<T, ExamQuestionsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ExamQuestions.
     * @param {ExamQuestionsUpsertArgs} args - Arguments to update or create a ExamQuestions.
     * @example
     * // Update or create a ExamQuestions
     * const examQuestions = await prisma.examQuestions.upsert({
     *   create: {
     *     // ... data to create a ExamQuestions
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExamQuestions we want to update
     *   }
     * })
     */
    upsert<T extends ExamQuestionsUpsertArgs>(args: SelectSubset<T, ExamQuestionsUpsertArgs<ExtArgs>>): Prisma__ExamQuestionsClient<$Result.GetResult<Prisma.$ExamQuestionsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ExamQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsCountArgs} args - Arguments to filter ExamQuestions to count.
     * @example
     * // Count the number of ExamQuestions
     * const count = await prisma.examQuestions.count({
     *   where: {
     *     // ... the filter for the ExamQuestions we want to count
     *   }
     * })
    **/
    count<T extends ExamQuestionsCountArgs>(
      args?: Subset<T, ExamQuestionsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExamQuestionsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExamQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExamQuestionsAggregateArgs>(args: Subset<T, ExamQuestionsAggregateArgs>): Prisma.PrismaPromise<GetExamQuestionsAggregateType<T>>

    /**
     * Group by ExamQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamQuestionsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExamQuestionsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExamQuestionsGroupByArgs['orderBy'] }
        : { orderBy?: ExamQuestionsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExamQuestionsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExamQuestionsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExamQuestions model
   */
  readonly fields: ExamQuestionsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExamQuestions.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExamQuestionsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    exam<T extends ExamDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ExamDefaultArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    question<T extends QuestionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, QuestionDefaultArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ExamQuestions model
   */
  interface ExamQuestionsFieldRefs {
    readonly id: FieldRef<"ExamQuestions", 'String'>
    readonly created_at: FieldRef<"ExamQuestions", 'DateTime'>
    readonly updated_at: FieldRef<"ExamQuestions", 'DateTime'>
    readonly exam_id: FieldRef<"ExamQuestions", 'String'>
    readonly question_id: FieldRef<"ExamQuestions", 'String'>
  }
    

  // Custom InputTypes
  /**
   * ExamQuestions findUnique
   */
  export type ExamQuestionsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which ExamQuestions to fetch.
     */
    where: ExamQuestionsWhereUniqueInput
  }

  /**
   * ExamQuestions findUniqueOrThrow
   */
  export type ExamQuestionsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which ExamQuestions to fetch.
     */
    where: ExamQuestionsWhereUniqueInput
  }

  /**
   * ExamQuestions findFirst
   */
  export type ExamQuestionsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which ExamQuestions to fetch.
     */
    where?: ExamQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamQuestions to fetch.
     */
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExamQuestions.
     */
    cursor?: ExamQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExamQuestions.
     */
    distinct?: ExamQuestionsScalarFieldEnum | ExamQuestionsScalarFieldEnum[]
  }

  /**
   * ExamQuestions findFirstOrThrow
   */
  export type ExamQuestionsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which ExamQuestions to fetch.
     */
    where?: ExamQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamQuestions to fetch.
     */
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExamQuestions.
     */
    cursor?: ExamQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExamQuestions.
     */
    distinct?: ExamQuestionsScalarFieldEnum | ExamQuestionsScalarFieldEnum[]
  }

  /**
   * ExamQuestions findMany
   */
  export type ExamQuestionsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which ExamQuestions to fetch.
     */
    where?: ExamQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamQuestions to fetch.
     */
    orderBy?: ExamQuestionsOrderByWithRelationInput | ExamQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExamQuestions.
     */
    cursor?: ExamQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamQuestions.
     */
    skip?: number
    distinct?: ExamQuestionsScalarFieldEnum | ExamQuestionsScalarFieldEnum[]
  }

  /**
   * ExamQuestions create
   */
  export type ExamQuestionsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * The data needed to create a ExamQuestions.
     */
    data: XOR<ExamQuestionsCreateInput, ExamQuestionsUncheckedCreateInput>
  }

  /**
   * ExamQuestions createMany
   */
  export type ExamQuestionsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExamQuestions.
     */
    data: ExamQuestionsCreateManyInput | ExamQuestionsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExamQuestions createManyAndReturn
   */
  export type ExamQuestionsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * The data used to create many ExamQuestions.
     */
    data: ExamQuestionsCreateManyInput | ExamQuestionsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ExamQuestions update
   */
  export type ExamQuestionsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * The data needed to update a ExamQuestions.
     */
    data: XOR<ExamQuestionsUpdateInput, ExamQuestionsUncheckedUpdateInput>
    /**
     * Choose, which ExamQuestions to update.
     */
    where: ExamQuestionsWhereUniqueInput
  }

  /**
   * ExamQuestions updateMany
   */
  export type ExamQuestionsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExamQuestions.
     */
    data: XOR<ExamQuestionsUpdateManyMutationInput, ExamQuestionsUncheckedUpdateManyInput>
    /**
     * Filter which ExamQuestions to update
     */
    where?: ExamQuestionsWhereInput
    /**
     * Limit how many ExamQuestions to update.
     */
    limit?: number
  }

  /**
   * ExamQuestions updateManyAndReturn
   */
  export type ExamQuestionsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * The data used to update ExamQuestions.
     */
    data: XOR<ExamQuestionsUpdateManyMutationInput, ExamQuestionsUncheckedUpdateManyInput>
    /**
     * Filter which ExamQuestions to update
     */
    where?: ExamQuestionsWhereInput
    /**
     * Limit how many ExamQuestions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ExamQuestions upsert
   */
  export type ExamQuestionsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * The filter to search for the ExamQuestions to update in case it exists.
     */
    where: ExamQuestionsWhereUniqueInput
    /**
     * In case the ExamQuestions found by the `where` argument doesn't exist, create a new ExamQuestions with this data.
     */
    create: XOR<ExamQuestionsCreateInput, ExamQuestionsUncheckedCreateInput>
    /**
     * In case the ExamQuestions was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExamQuestionsUpdateInput, ExamQuestionsUncheckedUpdateInput>
  }

  /**
   * ExamQuestions delete
   */
  export type ExamQuestionsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
    /**
     * Filter which ExamQuestions to delete.
     */
    where: ExamQuestionsWhereUniqueInput
  }

  /**
   * ExamQuestions deleteMany
   */
  export type ExamQuestionsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExamQuestions to delete
     */
    where?: ExamQuestionsWhereInput
    /**
     * Limit how many ExamQuestions to delete.
     */
    limit?: number
  }

  /**
   * ExamQuestions without action
   */
  export type ExamQuestionsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamQuestions
     */
    select?: ExamQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamQuestions
     */
    omit?: ExamQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamQuestionsInclude<ExtArgs> | null
  }


  /**
   * Model SubmissionQuestions
   */

  export type AggregateSubmissionQuestions = {
    _count: SubmissionQuestionsCountAggregateOutputType | null
    _avg: SubmissionQuestionsAvgAggregateOutputType | null
    _sum: SubmissionQuestionsSumAggregateOutputType | null
    _min: SubmissionQuestionsMinAggregateOutputType | null
    _max: SubmissionQuestionsMaxAggregateOutputType | null
  }

  export type SubmissionQuestionsAvgAggregateOutputType = {
    score: Decimal | null
  }

  export type SubmissionQuestionsSumAggregateOutputType = {
    score: Decimal | null
  }

  export type SubmissionQuestionsMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    submission_id: string | null
    question_id: string | null
    options: string | null
    answer: string | null
    score: Decimal | null
    is_correct: boolean | null
  }

  export type SubmissionQuestionsMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    submission_id: string | null
    question_id: string | null
    options: string | null
    answer: string | null
    score: Decimal | null
    is_correct: boolean | null
  }

  export type SubmissionQuestionsCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    submission_id: number
    question_id: number
    options: number
    answer: number
    score: number
    is_correct: number
    _all: number
  }


  export type SubmissionQuestionsAvgAggregateInputType = {
    score?: true
  }

  export type SubmissionQuestionsSumAggregateInputType = {
    score?: true
  }

  export type SubmissionQuestionsMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    submission_id?: true
    question_id?: true
    options?: true
    answer?: true
    score?: true
    is_correct?: true
  }

  export type SubmissionQuestionsMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    submission_id?: true
    question_id?: true
    options?: true
    answer?: true
    score?: true
    is_correct?: true
  }

  export type SubmissionQuestionsCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    submission_id?: true
    question_id?: true
    options?: true
    answer?: true
    score?: true
    is_correct?: true
    _all?: true
  }

  export type SubmissionQuestionsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SubmissionQuestions to aggregate.
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubmissionQuestions to fetch.
     */
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SubmissionQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubmissionQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubmissionQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SubmissionQuestions
    **/
    _count?: true | SubmissionQuestionsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SubmissionQuestionsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SubmissionQuestionsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SubmissionQuestionsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SubmissionQuestionsMaxAggregateInputType
  }

  export type GetSubmissionQuestionsAggregateType<T extends SubmissionQuestionsAggregateArgs> = {
        [P in keyof T & keyof AggregateSubmissionQuestions]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSubmissionQuestions[P]>
      : GetScalarType<T[P], AggregateSubmissionQuestions[P]>
  }




  export type SubmissionQuestionsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SubmissionQuestionsWhereInput
    orderBy?: SubmissionQuestionsOrderByWithAggregationInput | SubmissionQuestionsOrderByWithAggregationInput[]
    by: SubmissionQuestionsScalarFieldEnum[] | SubmissionQuestionsScalarFieldEnum
    having?: SubmissionQuestionsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SubmissionQuestionsCountAggregateInputType | true
    _avg?: SubmissionQuestionsAvgAggregateInputType
    _sum?: SubmissionQuestionsSumAggregateInputType
    _min?: SubmissionQuestionsMinAggregateInputType
    _max?: SubmissionQuestionsMaxAggregateInputType
  }

  export type SubmissionQuestionsGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    submission_id: string
    question_id: string
    options: string | null
    answer: string | null
    score: Decimal | null
    is_correct: boolean
    _count: SubmissionQuestionsCountAggregateOutputType | null
    _avg: SubmissionQuestionsAvgAggregateOutputType | null
    _sum: SubmissionQuestionsSumAggregateOutputType | null
    _min: SubmissionQuestionsMinAggregateOutputType | null
    _max: SubmissionQuestionsMaxAggregateOutputType | null
  }

  type GetSubmissionQuestionsGroupByPayload<T extends SubmissionQuestionsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SubmissionQuestionsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SubmissionQuestionsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SubmissionQuestionsGroupByOutputType[P]>
            : GetScalarType<T[P], SubmissionQuestionsGroupByOutputType[P]>
        }
      >
    >


  export type SubmissionQuestionsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    submission_id?: boolean
    question_id?: boolean
    options?: boolean
    answer?: boolean
    score?: boolean
    is_correct?: boolean
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submissionQuestions"]>

  export type SubmissionQuestionsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    submission_id?: boolean
    question_id?: boolean
    options?: boolean
    answer?: boolean
    score?: boolean
    is_correct?: boolean
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submissionQuestions"]>

  export type SubmissionQuestionsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    submission_id?: boolean
    question_id?: boolean
    options?: boolean
    answer?: boolean
    score?: boolean
    is_correct?: boolean
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["submissionQuestions"]>

  export type SubmissionQuestionsSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    submission_id?: boolean
    question_id?: boolean
    options?: boolean
    answer?: boolean
    score?: boolean
    is_correct?: boolean
  }

  export type SubmissionQuestionsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "submission_id" | "question_id" | "options" | "answer" | "score" | "is_correct", ExtArgs["result"]["submissionQuestions"]>
  export type SubmissionQuestionsInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }
  export type SubmissionQuestionsIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }
  export type SubmissionQuestionsIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    submission?: boolean | SubmissionDefaultArgs<ExtArgs>
    question?: boolean | QuestionDefaultArgs<ExtArgs>
  }

  export type $SubmissionQuestionsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SubmissionQuestions"
    objects: {
      submission: Prisma.$SubmissionPayload<ExtArgs>
      question: Prisma.$QuestionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      submission_id: string
      question_id: string
      options: string | null
      answer: string | null
      score: Prisma.Decimal | null
      is_correct: boolean
    }, ExtArgs["result"]["submissionQuestions"]>
    composites: {}
  }

  type SubmissionQuestionsGetPayload<S extends boolean | null | undefined | SubmissionQuestionsDefaultArgs> = $Result.GetResult<Prisma.$SubmissionQuestionsPayload, S>

  type SubmissionQuestionsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SubmissionQuestionsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SubmissionQuestionsCountAggregateInputType | true
    }

  export interface SubmissionQuestionsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SubmissionQuestions'], meta: { name: 'SubmissionQuestions' } }
    /**
     * Find zero or one SubmissionQuestions that matches the filter.
     * @param {SubmissionQuestionsFindUniqueArgs} args - Arguments to find a SubmissionQuestions
     * @example
     * // Get one SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SubmissionQuestionsFindUniqueArgs>(args: SelectSubset<T, SubmissionQuestionsFindUniqueArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SubmissionQuestions that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SubmissionQuestionsFindUniqueOrThrowArgs} args - Arguments to find a SubmissionQuestions
     * @example
     * // Get one SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SubmissionQuestionsFindUniqueOrThrowArgs>(args: SelectSubset<T, SubmissionQuestionsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SubmissionQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsFindFirstArgs} args - Arguments to find a SubmissionQuestions
     * @example
     * // Get one SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SubmissionQuestionsFindFirstArgs>(args?: SelectSubset<T, SubmissionQuestionsFindFirstArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SubmissionQuestions that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsFindFirstOrThrowArgs} args - Arguments to find a SubmissionQuestions
     * @example
     * // Get one SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SubmissionQuestionsFindFirstOrThrowArgs>(args?: SelectSubset<T, SubmissionQuestionsFindFirstOrThrowArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SubmissionQuestions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findMany()
     * 
     * // Get first 10 SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const submissionQuestionsWithIdOnly = await prisma.submissionQuestions.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SubmissionQuestionsFindManyArgs>(args?: SelectSubset<T, SubmissionQuestionsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SubmissionQuestions.
     * @param {SubmissionQuestionsCreateArgs} args - Arguments to create a SubmissionQuestions.
     * @example
     * // Create one SubmissionQuestions
     * const SubmissionQuestions = await prisma.submissionQuestions.create({
     *   data: {
     *     // ... data to create a SubmissionQuestions
     *   }
     * })
     * 
     */
    create<T extends SubmissionQuestionsCreateArgs>(args: SelectSubset<T, SubmissionQuestionsCreateArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SubmissionQuestions.
     * @param {SubmissionQuestionsCreateManyArgs} args - Arguments to create many SubmissionQuestions.
     * @example
     * // Create many SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SubmissionQuestionsCreateManyArgs>(args?: SelectSubset<T, SubmissionQuestionsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SubmissionQuestions and returns the data saved in the database.
     * @param {SubmissionQuestionsCreateManyAndReturnArgs} args - Arguments to create many SubmissionQuestions.
     * @example
     * // Create many SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SubmissionQuestions and only return the `id`
     * const submissionQuestionsWithIdOnly = await prisma.submissionQuestions.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SubmissionQuestionsCreateManyAndReturnArgs>(args?: SelectSubset<T, SubmissionQuestionsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SubmissionQuestions.
     * @param {SubmissionQuestionsDeleteArgs} args - Arguments to delete one SubmissionQuestions.
     * @example
     * // Delete one SubmissionQuestions
     * const SubmissionQuestions = await prisma.submissionQuestions.delete({
     *   where: {
     *     // ... filter to delete one SubmissionQuestions
     *   }
     * })
     * 
     */
    delete<T extends SubmissionQuestionsDeleteArgs>(args: SelectSubset<T, SubmissionQuestionsDeleteArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SubmissionQuestions.
     * @param {SubmissionQuestionsUpdateArgs} args - Arguments to update one SubmissionQuestions.
     * @example
     * // Update one SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SubmissionQuestionsUpdateArgs>(args: SelectSubset<T, SubmissionQuestionsUpdateArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SubmissionQuestions.
     * @param {SubmissionQuestionsDeleteManyArgs} args - Arguments to filter SubmissionQuestions to delete.
     * @example
     * // Delete a few SubmissionQuestions
     * const { count } = await prisma.submissionQuestions.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SubmissionQuestionsDeleteManyArgs>(args?: SelectSubset<T, SubmissionQuestionsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SubmissionQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SubmissionQuestionsUpdateManyArgs>(args: SelectSubset<T, SubmissionQuestionsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SubmissionQuestions and returns the data updated in the database.
     * @param {SubmissionQuestionsUpdateManyAndReturnArgs} args - Arguments to update many SubmissionQuestions.
     * @example
     * // Update many SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SubmissionQuestions and only return the `id`
     * const submissionQuestionsWithIdOnly = await prisma.submissionQuestions.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SubmissionQuestionsUpdateManyAndReturnArgs>(args: SelectSubset<T, SubmissionQuestionsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SubmissionQuestions.
     * @param {SubmissionQuestionsUpsertArgs} args - Arguments to update or create a SubmissionQuestions.
     * @example
     * // Update or create a SubmissionQuestions
     * const submissionQuestions = await prisma.submissionQuestions.upsert({
     *   create: {
     *     // ... data to create a SubmissionQuestions
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SubmissionQuestions we want to update
     *   }
     * })
     */
    upsert<T extends SubmissionQuestionsUpsertArgs>(args: SelectSubset<T, SubmissionQuestionsUpsertArgs<ExtArgs>>): Prisma__SubmissionQuestionsClient<$Result.GetResult<Prisma.$SubmissionQuestionsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SubmissionQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsCountArgs} args - Arguments to filter SubmissionQuestions to count.
     * @example
     * // Count the number of SubmissionQuestions
     * const count = await prisma.submissionQuestions.count({
     *   where: {
     *     // ... the filter for the SubmissionQuestions we want to count
     *   }
     * })
    **/
    count<T extends SubmissionQuestionsCountArgs>(
      args?: Subset<T, SubmissionQuestionsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SubmissionQuestionsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SubmissionQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SubmissionQuestionsAggregateArgs>(args: Subset<T, SubmissionQuestionsAggregateArgs>): Prisma.PrismaPromise<GetSubmissionQuestionsAggregateType<T>>

    /**
     * Group by SubmissionQuestions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SubmissionQuestionsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SubmissionQuestionsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SubmissionQuestionsGroupByArgs['orderBy'] }
        : { orderBy?: SubmissionQuestionsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SubmissionQuestionsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSubmissionQuestionsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SubmissionQuestions model
   */
  readonly fields: SubmissionQuestionsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SubmissionQuestions.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SubmissionQuestionsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    submission<T extends SubmissionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, SubmissionDefaultArgs<ExtArgs>>): Prisma__SubmissionClient<$Result.GetResult<Prisma.$SubmissionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    question<T extends QuestionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, QuestionDefaultArgs<ExtArgs>>): Prisma__QuestionClient<$Result.GetResult<Prisma.$QuestionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SubmissionQuestions model
   */
  interface SubmissionQuestionsFieldRefs {
    readonly id: FieldRef<"SubmissionQuestions", 'String'>
    readonly created_at: FieldRef<"SubmissionQuestions", 'DateTime'>
    readonly updated_at: FieldRef<"SubmissionQuestions", 'DateTime'>
    readonly submission_id: FieldRef<"SubmissionQuestions", 'String'>
    readonly question_id: FieldRef<"SubmissionQuestions", 'String'>
    readonly options: FieldRef<"SubmissionQuestions", 'String'>
    readonly answer: FieldRef<"SubmissionQuestions", 'String'>
    readonly score: FieldRef<"SubmissionQuestions", 'Decimal'>
    readonly is_correct: FieldRef<"SubmissionQuestions", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * SubmissionQuestions findUnique
   */
  export type SubmissionQuestionsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which SubmissionQuestions to fetch.
     */
    where: SubmissionQuestionsWhereUniqueInput
  }

  /**
   * SubmissionQuestions findUniqueOrThrow
   */
  export type SubmissionQuestionsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which SubmissionQuestions to fetch.
     */
    where: SubmissionQuestionsWhereUniqueInput
  }

  /**
   * SubmissionQuestions findFirst
   */
  export type SubmissionQuestionsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which SubmissionQuestions to fetch.
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubmissionQuestions to fetch.
     */
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SubmissionQuestions.
     */
    cursor?: SubmissionQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubmissionQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubmissionQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SubmissionQuestions.
     */
    distinct?: SubmissionQuestionsScalarFieldEnum | SubmissionQuestionsScalarFieldEnum[]
  }

  /**
   * SubmissionQuestions findFirstOrThrow
   */
  export type SubmissionQuestionsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which SubmissionQuestions to fetch.
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubmissionQuestions to fetch.
     */
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SubmissionQuestions.
     */
    cursor?: SubmissionQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubmissionQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubmissionQuestions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SubmissionQuestions.
     */
    distinct?: SubmissionQuestionsScalarFieldEnum | SubmissionQuestionsScalarFieldEnum[]
  }

  /**
   * SubmissionQuestions findMany
   */
  export type SubmissionQuestionsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter, which SubmissionQuestions to fetch.
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SubmissionQuestions to fetch.
     */
    orderBy?: SubmissionQuestionsOrderByWithRelationInput | SubmissionQuestionsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SubmissionQuestions.
     */
    cursor?: SubmissionQuestionsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SubmissionQuestions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SubmissionQuestions.
     */
    skip?: number
    distinct?: SubmissionQuestionsScalarFieldEnum | SubmissionQuestionsScalarFieldEnum[]
  }

  /**
   * SubmissionQuestions create
   */
  export type SubmissionQuestionsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * The data needed to create a SubmissionQuestions.
     */
    data: XOR<SubmissionQuestionsCreateInput, SubmissionQuestionsUncheckedCreateInput>
  }

  /**
   * SubmissionQuestions createMany
   */
  export type SubmissionQuestionsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SubmissionQuestions.
     */
    data: SubmissionQuestionsCreateManyInput | SubmissionQuestionsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SubmissionQuestions createManyAndReturn
   */
  export type SubmissionQuestionsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * The data used to create many SubmissionQuestions.
     */
    data: SubmissionQuestionsCreateManyInput | SubmissionQuestionsCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SubmissionQuestions update
   */
  export type SubmissionQuestionsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * The data needed to update a SubmissionQuestions.
     */
    data: XOR<SubmissionQuestionsUpdateInput, SubmissionQuestionsUncheckedUpdateInput>
    /**
     * Choose, which SubmissionQuestions to update.
     */
    where: SubmissionQuestionsWhereUniqueInput
  }

  /**
   * SubmissionQuestions updateMany
   */
  export type SubmissionQuestionsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SubmissionQuestions.
     */
    data: XOR<SubmissionQuestionsUpdateManyMutationInput, SubmissionQuestionsUncheckedUpdateManyInput>
    /**
     * Filter which SubmissionQuestions to update
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * Limit how many SubmissionQuestions to update.
     */
    limit?: number
  }

  /**
   * SubmissionQuestions updateManyAndReturn
   */
  export type SubmissionQuestionsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * The data used to update SubmissionQuestions.
     */
    data: XOR<SubmissionQuestionsUpdateManyMutationInput, SubmissionQuestionsUncheckedUpdateManyInput>
    /**
     * Filter which SubmissionQuestions to update
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * Limit how many SubmissionQuestions to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * SubmissionQuestions upsert
   */
  export type SubmissionQuestionsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * The filter to search for the SubmissionQuestions to update in case it exists.
     */
    where: SubmissionQuestionsWhereUniqueInput
    /**
     * In case the SubmissionQuestions found by the `where` argument doesn't exist, create a new SubmissionQuestions with this data.
     */
    create: XOR<SubmissionQuestionsCreateInput, SubmissionQuestionsUncheckedCreateInput>
    /**
     * In case the SubmissionQuestions was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SubmissionQuestionsUpdateInput, SubmissionQuestionsUncheckedUpdateInput>
  }

  /**
   * SubmissionQuestions delete
   */
  export type SubmissionQuestionsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
    /**
     * Filter which SubmissionQuestions to delete.
     */
    where: SubmissionQuestionsWhereUniqueInput
  }

  /**
   * SubmissionQuestions deleteMany
   */
  export type SubmissionQuestionsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SubmissionQuestions to delete
     */
    where?: SubmissionQuestionsWhereInput
    /**
     * Limit how many SubmissionQuestions to delete.
     */
    limit?: number
  }

  /**
   * SubmissionQuestions without action
   */
  export type SubmissionQuestionsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SubmissionQuestions
     */
    select?: SubmissionQuestionsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SubmissionQuestions
     */
    omit?: SubmissionQuestionsOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SubmissionQuestionsInclude<ExtArgs> | null
  }


  /**
   * Model ExamRegistration
   */

  export type AggregateExamRegistration = {
    _count: ExamRegistrationCountAggregateOutputType | null
    _min: ExamRegistrationMinAggregateOutputType | null
    _max: ExamRegistrationMaxAggregateOutputType | null
  }

  export type ExamRegistrationMinAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    student_id: string | null
    status: $Enums.RegistrationStatus | null
  }

  export type ExamRegistrationMaxAggregateOutputType = {
    id: string | null
    created_at: Date | null
    updated_at: Date | null
    exam_id: string | null
    student_id: string | null
    status: $Enums.RegistrationStatus | null
  }

  export type ExamRegistrationCountAggregateOutputType = {
    id: number
    created_at: number
    updated_at: number
    exam_id: number
    student_id: number
    status: number
    _all: number
  }


  export type ExamRegistrationMinAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    status?: true
  }

  export type ExamRegistrationMaxAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    status?: true
  }

  export type ExamRegistrationCountAggregateInputType = {
    id?: true
    created_at?: true
    updated_at?: true
    exam_id?: true
    student_id?: true
    status?: true
    _all?: true
  }

  export type ExamRegistrationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExamRegistration to aggregate.
     */
    where?: ExamRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamRegistrations to fetch.
     */
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ExamRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ExamRegistrations
    **/
    _count?: true | ExamRegistrationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ExamRegistrationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ExamRegistrationMaxAggregateInputType
  }

  export type GetExamRegistrationAggregateType<T extends ExamRegistrationAggregateArgs> = {
        [P in keyof T & keyof AggregateExamRegistration]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateExamRegistration[P]>
      : GetScalarType<T[P], AggregateExamRegistration[P]>
  }




  export type ExamRegistrationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ExamRegistrationWhereInput
    orderBy?: ExamRegistrationOrderByWithAggregationInput | ExamRegistrationOrderByWithAggregationInput[]
    by: ExamRegistrationScalarFieldEnum[] | ExamRegistrationScalarFieldEnum
    having?: ExamRegistrationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ExamRegistrationCountAggregateInputType | true
    _min?: ExamRegistrationMinAggregateInputType
    _max?: ExamRegistrationMaxAggregateInputType
  }

  export type ExamRegistrationGroupByOutputType = {
    id: string
    created_at: Date
    updated_at: Date
    exam_id: string
    student_id: string
    status: $Enums.RegistrationStatus
    _count: ExamRegistrationCountAggregateOutputType | null
    _min: ExamRegistrationMinAggregateOutputType | null
    _max: ExamRegistrationMaxAggregateOutputType | null
  }

  type GetExamRegistrationGroupByPayload<T extends ExamRegistrationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ExamRegistrationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ExamRegistrationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ExamRegistrationGroupByOutputType[P]>
            : GetScalarType<T[P], ExamRegistrationGroupByOutputType[P]>
        }
      >
    >


  export type ExamRegistrationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    status?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examRegistration"]>

  export type ExamRegistrationSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    status?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examRegistration"]>

  export type ExamRegistrationSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    status?: boolean
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["examRegistration"]>

  export type ExamRegistrationSelectScalar = {
    id?: boolean
    created_at?: boolean
    updated_at?: boolean
    exam_id?: boolean
    student_id?: boolean
    status?: boolean
  }

  export type ExamRegistrationOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "created_at" | "updated_at" | "exam_id" | "student_id" | "status", ExtArgs["result"]["examRegistration"]>
  export type ExamRegistrationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ExamRegistrationIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type ExamRegistrationIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    exam?: boolean | ExamDefaultArgs<ExtArgs>
    student?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ExamRegistrationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ExamRegistration"
    objects: {
      exam: Prisma.$ExamPayload<ExtArgs>
      student: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      created_at: Date
      updated_at: Date
      exam_id: string
      student_id: string
      status: $Enums.RegistrationStatus
    }, ExtArgs["result"]["examRegistration"]>
    composites: {}
  }

  type ExamRegistrationGetPayload<S extends boolean | null | undefined | ExamRegistrationDefaultArgs> = $Result.GetResult<Prisma.$ExamRegistrationPayload, S>

  type ExamRegistrationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ExamRegistrationFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ExamRegistrationCountAggregateInputType | true
    }

  export interface ExamRegistrationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ExamRegistration'], meta: { name: 'ExamRegistration' } }
    /**
     * Find zero or one ExamRegistration that matches the filter.
     * @param {ExamRegistrationFindUniqueArgs} args - Arguments to find a ExamRegistration
     * @example
     * // Get one ExamRegistration
     * const examRegistration = await prisma.examRegistration.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ExamRegistrationFindUniqueArgs>(args: SelectSubset<T, ExamRegistrationFindUniqueArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ExamRegistration that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ExamRegistrationFindUniqueOrThrowArgs} args - Arguments to find a ExamRegistration
     * @example
     * // Get one ExamRegistration
     * const examRegistration = await prisma.examRegistration.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ExamRegistrationFindUniqueOrThrowArgs>(args: SelectSubset<T, ExamRegistrationFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExamRegistration that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationFindFirstArgs} args - Arguments to find a ExamRegistration
     * @example
     * // Get one ExamRegistration
     * const examRegistration = await prisma.examRegistration.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ExamRegistrationFindFirstArgs>(args?: SelectSubset<T, ExamRegistrationFindFirstArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ExamRegistration that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationFindFirstOrThrowArgs} args - Arguments to find a ExamRegistration
     * @example
     * // Get one ExamRegistration
     * const examRegistration = await prisma.examRegistration.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ExamRegistrationFindFirstOrThrowArgs>(args?: SelectSubset<T, ExamRegistrationFindFirstOrThrowArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ExamRegistrations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ExamRegistrations
     * const examRegistrations = await prisma.examRegistration.findMany()
     * 
     * // Get first 10 ExamRegistrations
     * const examRegistrations = await prisma.examRegistration.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const examRegistrationWithIdOnly = await prisma.examRegistration.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ExamRegistrationFindManyArgs>(args?: SelectSubset<T, ExamRegistrationFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ExamRegistration.
     * @param {ExamRegistrationCreateArgs} args - Arguments to create a ExamRegistration.
     * @example
     * // Create one ExamRegistration
     * const ExamRegistration = await prisma.examRegistration.create({
     *   data: {
     *     // ... data to create a ExamRegistration
     *   }
     * })
     * 
     */
    create<T extends ExamRegistrationCreateArgs>(args: SelectSubset<T, ExamRegistrationCreateArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ExamRegistrations.
     * @param {ExamRegistrationCreateManyArgs} args - Arguments to create many ExamRegistrations.
     * @example
     * // Create many ExamRegistrations
     * const examRegistration = await prisma.examRegistration.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ExamRegistrationCreateManyArgs>(args?: SelectSubset<T, ExamRegistrationCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ExamRegistrations and returns the data saved in the database.
     * @param {ExamRegistrationCreateManyAndReturnArgs} args - Arguments to create many ExamRegistrations.
     * @example
     * // Create many ExamRegistrations
     * const examRegistration = await prisma.examRegistration.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ExamRegistrations and only return the `id`
     * const examRegistrationWithIdOnly = await prisma.examRegistration.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ExamRegistrationCreateManyAndReturnArgs>(args?: SelectSubset<T, ExamRegistrationCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ExamRegistration.
     * @param {ExamRegistrationDeleteArgs} args - Arguments to delete one ExamRegistration.
     * @example
     * // Delete one ExamRegistration
     * const ExamRegistration = await prisma.examRegistration.delete({
     *   where: {
     *     // ... filter to delete one ExamRegistration
     *   }
     * })
     * 
     */
    delete<T extends ExamRegistrationDeleteArgs>(args: SelectSubset<T, ExamRegistrationDeleteArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ExamRegistration.
     * @param {ExamRegistrationUpdateArgs} args - Arguments to update one ExamRegistration.
     * @example
     * // Update one ExamRegistration
     * const examRegistration = await prisma.examRegistration.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ExamRegistrationUpdateArgs>(args: SelectSubset<T, ExamRegistrationUpdateArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ExamRegistrations.
     * @param {ExamRegistrationDeleteManyArgs} args - Arguments to filter ExamRegistrations to delete.
     * @example
     * // Delete a few ExamRegistrations
     * const { count } = await prisma.examRegistration.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ExamRegistrationDeleteManyArgs>(args?: SelectSubset<T, ExamRegistrationDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExamRegistrations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ExamRegistrations
     * const examRegistration = await prisma.examRegistration.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ExamRegistrationUpdateManyArgs>(args: SelectSubset<T, ExamRegistrationUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ExamRegistrations and returns the data updated in the database.
     * @param {ExamRegistrationUpdateManyAndReturnArgs} args - Arguments to update many ExamRegistrations.
     * @example
     * // Update many ExamRegistrations
     * const examRegistration = await prisma.examRegistration.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ExamRegistrations and only return the `id`
     * const examRegistrationWithIdOnly = await prisma.examRegistration.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ExamRegistrationUpdateManyAndReturnArgs>(args: SelectSubset<T, ExamRegistrationUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ExamRegistration.
     * @param {ExamRegistrationUpsertArgs} args - Arguments to update or create a ExamRegistration.
     * @example
     * // Update or create a ExamRegistration
     * const examRegistration = await prisma.examRegistration.upsert({
     *   create: {
     *     // ... data to create a ExamRegistration
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ExamRegistration we want to update
     *   }
     * })
     */
    upsert<T extends ExamRegistrationUpsertArgs>(args: SelectSubset<T, ExamRegistrationUpsertArgs<ExtArgs>>): Prisma__ExamRegistrationClient<$Result.GetResult<Prisma.$ExamRegistrationPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ExamRegistrations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationCountArgs} args - Arguments to filter ExamRegistrations to count.
     * @example
     * // Count the number of ExamRegistrations
     * const count = await prisma.examRegistration.count({
     *   where: {
     *     // ... the filter for the ExamRegistrations we want to count
     *   }
     * })
    **/
    count<T extends ExamRegistrationCountArgs>(
      args?: Subset<T, ExamRegistrationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ExamRegistrationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ExamRegistration.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ExamRegistrationAggregateArgs>(args: Subset<T, ExamRegistrationAggregateArgs>): Prisma.PrismaPromise<GetExamRegistrationAggregateType<T>>

    /**
     * Group by ExamRegistration.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ExamRegistrationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ExamRegistrationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ExamRegistrationGroupByArgs['orderBy'] }
        : { orderBy?: ExamRegistrationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ExamRegistrationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetExamRegistrationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ExamRegistration model
   */
  readonly fields: ExamRegistrationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ExamRegistration.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ExamRegistrationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    exam<T extends ExamDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ExamDefaultArgs<ExtArgs>>): Prisma__ExamClient<$Result.GetResult<Prisma.$ExamPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    student<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ExamRegistration model
   */
  interface ExamRegistrationFieldRefs {
    readonly id: FieldRef<"ExamRegistration", 'String'>
    readonly created_at: FieldRef<"ExamRegistration", 'DateTime'>
    readonly updated_at: FieldRef<"ExamRegistration", 'DateTime'>
    readonly exam_id: FieldRef<"ExamRegistration", 'String'>
    readonly student_id: FieldRef<"ExamRegistration", 'String'>
    readonly status: FieldRef<"ExamRegistration", 'RegistrationStatus'>
  }
    

  // Custom InputTypes
  /**
   * ExamRegistration findUnique
   */
  export type ExamRegistrationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter, which ExamRegistration to fetch.
     */
    where: ExamRegistrationWhereUniqueInput
  }

  /**
   * ExamRegistration findUniqueOrThrow
   */
  export type ExamRegistrationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter, which ExamRegistration to fetch.
     */
    where: ExamRegistrationWhereUniqueInput
  }

  /**
   * ExamRegistration findFirst
   */
  export type ExamRegistrationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter, which ExamRegistration to fetch.
     */
    where?: ExamRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamRegistrations to fetch.
     */
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExamRegistrations.
     */
    cursor?: ExamRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExamRegistrations.
     */
    distinct?: ExamRegistrationScalarFieldEnum | ExamRegistrationScalarFieldEnum[]
  }

  /**
   * ExamRegistration findFirstOrThrow
   */
  export type ExamRegistrationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter, which ExamRegistration to fetch.
     */
    where?: ExamRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamRegistrations to fetch.
     */
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ExamRegistrations.
     */
    cursor?: ExamRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamRegistrations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ExamRegistrations.
     */
    distinct?: ExamRegistrationScalarFieldEnum | ExamRegistrationScalarFieldEnum[]
  }

  /**
   * ExamRegistration findMany
   */
  export type ExamRegistrationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter, which ExamRegistrations to fetch.
     */
    where?: ExamRegistrationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ExamRegistrations to fetch.
     */
    orderBy?: ExamRegistrationOrderByWithRelationInput | ExamRegistrationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ExamRegistrations.
     */
    cursor?: ExamRegistrationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ExamRegistrations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ExamRegistrations.
     */
    skip?: number
    distinct?: ExamRegistrationScalarFieldEnum | ExamRegistrationScalarFieldEnum[]
  }

  /**
   * ExamRegistration create
   */
  export type ExamRegistrationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * The data needed to create a ExamRegistration.
     */
    data: XOR<ExamRegistrationCreateInput, ExamRegistrationUncheckedCreateInput>
  }

  /**
   * ExamRegistration createMany
   */
  export type ExamRegistrationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ExamRegistrations.
     */
    data: ExamRegistrationCreateManyInput | ExamRegistrationCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ExamRegistration createManyAndReturn
   */
  export type ExamRegistrationCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * The data used to create many ExamRegistrations.
     */
    data: ExamRegistrationCreateManyInput | ExamRegistrationCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ExamRegistration update
   */
  export type ExamRegistrationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * The data needed to update a ExamRegistration.
     */
    data: XOR<ExamRegistrationUpdateInput, ExamRegistrationUncheckedUpdateInput>
    /**
     * Choose, which ExamRegistration to update.
     */
    where: ExamRegistrationWhereUniqueInput
  }

  /**
   * ExamRegistration updateMany
   */
  export type ExamRegistrationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ExamRegistrations.
     */
    data: XOR<ExamRegistrationUpdateManyMutationInput, ExamRegistrationUncheckedUpdateManyInput>
    /**
     * Filter which ExamRegistrations to update
     */
    where?: ExamRegistrationWhereInput
    /**
     * Limit how many ExamRegistrations to update.
     */
    limit?: number
  }

  /**
   * ExamRegistration updateManyAndReturn
   */
  export type ExamRegistrationUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * The data used to update ExamRegistrations.
     */
    data: XOR<ExamRegistrationUpdateManyMutationInput, ExamRegistrationUncheckedUpdateManyInput>
    /**
     * Filter which ExamRegistrations to update
     */
    where?: ExamRegistrationWhereInput
    /**
     * Limit how many ExamRegistrations to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ExamRegistration upsert
   */
  export type ExamRegistrationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * The filter to search for the ExamRegistration to update in case it exists.
     */
    where: ExamRegistrationWhereUniqueInput
    /**
     * In case the ExamRegistration found by the `where` argument doesn't exist, create a new ExamRegistration with this data.
     */
    create: XOR<ExamRegistrationCreateInput, ExamRegistrationUncheckedCreateInput>
    /**
     * In case the ExamRegistration was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ExamRegistrationUpdateInput, ExamRegistrationUncheckedUpdateInput>
  }

  /**
   * ExamRegistration delete
   */
  export type ExamRegistrationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
    /**
     * Filter which ExamRegistration to delete.
     */
    where: ExamRegistrationWhereUniqueInput
  }

  /**
   * ExamRegistration deleteMany
   */
  export type ExamRegistrationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ExamRegistrations to delete
     */
    where?: ExamRegistrationWhereInput
    /**
     * Limit how many ExamRegistrations to delete.
     */
    limit?: number
  }

  /**
   * ExamRegistration without action
   */
  export type ExamRegistrationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ExamRegistration
     */
    select?: ExamRegistrationSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ExamRegistration
     */
    omit?: ExamRegistrationOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ExamRegistrationInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    full_name: 'full_name',
    email: 'email',
    password: 'password',
    avatar_url: 'avatar_url',
    role: 'role',
    auth_provider: 'auth_provider',
    provider_id: 'provider_id',
    school: 'school',
    phone: 'phone',
    address: 'address'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const ExamScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    lecturer_id: 'lecturer_id',
    topic: 'topic',
    title: 'title',
    exam_start_time: 'exam_start_time',
    exam_end_time: 'exam_end_time',
    duration: 'duration',
    practice: 'practice',
    mode: 'mode',
    sample_size: 'sample_size',
    distribution: 'distribution',
    is_public: 'is_public',
    status: 'status'
  };

  export type ExamScalarFieldEnum = (typeof ExamScalarFieldEnum)[keyof typeof ExamScalarFieldEnum]


  export const SubmissionScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    exam_id: 'exam_id',
    student_id: 'student_id',
    total_score: 'total_score',
    rating: 'rating',
    start_time: 'start_time',
    end_time: 'end_time',
    status: 'status'
  };

  export type SubmissionScalarFieldEnum = (typeof SubmissionScalarFieldEnum)[keyof typeof SubmissionScalarFieldEnum]


  export const QuestionScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    lecturer_id: 'lecturer_id',
    question_text: 'question_text',
    topic: 'topic',
    options: 'options',
    correct_answer: 'correct_answer',
    image_url: 'image_url',
    question_type: 'question_type',
    question_format: 'question_format'
  };

  export type QuestionScalarFieldEnum = (typeof QuestionScalarFieldEnum)[keyof typeof QuestionScalarFieldEnum]


  export const ExamQuestionsScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    exam_id: 'exam_id',
    question_id: 'question_id'
  };

  export type ExamQuestionsScalarFieldEnum = (typeof ExamQuestionsScalarFieldEnum)[keyof typeof ExamQuestionsScalarFieldEnum]


  export const SubmissionQuestionsScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    submission_id: 'submission_id',
    question_id: 'question_id',
    options: 'options',
    answer: 'answer',
    score: 'score',
    is_correct: 'is_correct'
  };

  export type SubmissionQuestionsScalarFieldEnum = (typeof SubmissionQuestionsScalarFieldEnum)[keyof typeof SubmissionQuestionsScalarFieldEnum]


  export const ExamRegistrationScalarFieldEnum: {
    id: 'id',
    created_at: 'created_at',
    updated_at: 'updated_at',
    exam_id: 'exam_id',
    student_id: 'student_id',
    status: 'status'
  };

  export type ExamRegistrationScalarFieldEnum = (typeof ExamRegistrationScalarFieldEnum)[keyof typeof ExamRegistrationScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'SelectionMode'
   */
  export type EnumSelectionModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SelectionMode'>
    


  /**
   * Reference to a field of type 'SelectionMode[]'
   */
  export type ListEnumSelectionModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SelectionMode[]'>
    


  /**
   * Reference to a field of type 'ExamStatus'
   */
  export type EnumExamStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ExamStatus'>
    


  /**
   * Reference to a field of type 'ExamStatus[]'
   */
  export type ListEnumExamStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ExamStatus[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'Rating'
   */
  export type EnumRatingFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Rating'>
    


  /**
   * Reference to a field of type 'Rating[]'
   */
  export type ListEnumRatingFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Rating[]'>
    


  /**
   * Reference to a field of type 'SubmissionStatus'
   */
  export type EnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus'>
    


  /**
   * Reference to a field of type 'SubmissionStatus[]'
   */
  export type ListEnumSubmissionStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'SubmissionStatus[]'>
    


  /**
   * Reference to a field of type 'QuestionType'
   */
  export type EnumQuestionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QuestionType'>
    


  /**
   * Reference to a field of type 'QuestionType[]'
   */
  export type ListEnumQuestionTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QuestionType[]'>
    


  /**
   * Reference to a field of type 'QuestionFormat'
   */
  export type EnumQuestionFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QuestionFormat'>
    


  /**
   * Reference to a field of type 'QuestionFormat[]'
   */
  export type ListEnumQuestionFormatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QuestionFormat[]'>
    


  /**
   * Reference to a field of type 'RegistrationStatus'
   */
  export type EnumRegistrationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RegistrationStatus'>
    


  /**
   * Reference to a field of type 'RegistrationStatus[]'
   */
  export type ListEnumRegistrationStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'RegistrationStatus[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    created_at?: DateTimeFilter<"User"> | Date | string
    updated_at?: DateTimeFilter<"User"> | Date | string
    full_name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    avatar_url?: StringNullableFilter<"User"> | string | null
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    auth_provider?: StringFilter<"User"> | string
    provider_id?: StringNullableFilter<"User"> | string | null
    school?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    exams?: ExamListRelationFilter
    questions?: QuestionListRelationFilter
    submissions?: SubmissionListRelationFilter
    registrations?: ExamRegistrationListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    full_name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    role?: SortOrder
    auth_provider?: SortOrder
    provider_id?: SortOrderInput | SortOrder
    school?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    exams?: ExamOrderByRelationAggregateInput
    questions?: QuestionOrderByRelationAggregateInput
    submissions?: SubmissionOrderByRelationAggregateInput
    registrations?: ExamRegistrationOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    created_at?: DateTimeFilter<"User"> | Date | string
    updated_at?: DateTimeFilter<"User"> | Date | string
    full_name?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    avatar_url?: StringNullableFilter<"User"> | string | null
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    auth_provider?: StringFilter<"User"> | string
    provider_id?: StringNullableFilter<"User"> | string | null
    school?: StringNullableFilter<"User"> | string | null
    phone?: StringNullableFilter<"User"> | string | null
    address?: StringNullableFilter<"User"> | string | null
    exams?: ExamListRelationFilter
    questions?: QuestionListRelationFilter
    submissions?: SubmissionListRelationFilter
    registrations?: ExamRegistrationListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    full_name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    role?: SortOrder
    auth_provider?: SortOrder
    provider_id?: SortOrderInput | SortOrder
    school?: SortOrderInput | SortOrder
    phone?: SortOrderInput | SortOrder
    address?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    created_at?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"User"> | Date | string
    full_name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    avatar_url?: StringNullableWithAggregatesFilter<"User"> | string | null
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    auth_provider?: StringWithAggregatesFilter<"User"> | string
    provider_id?: StringNullableWithAggregatesFilter<"User"> | string | null
    school?: StringNullableWithAggregatesFilter<"User"> | string | null
    phone?: StringNullableWithAggregatesFilter<"User"> | string | null
    address?: StringNullableWithAggregatesFilter<"User"> | string | null
  }

  export type ExamWhereInput = {
    AND?: ExamWhereInput | ExamWhereInput[]
    OR?: ExamWhereInput[]
    NOT?: ExamWhereInput | ExamWhereInput[]
    id?: UuidFilter<"Exam"> | string
    created_at?: DateTimeFilter<"Exam"> | Date | string
    updated_at?: DateTimeFilter<"Exam"> | Date | string
    lecturer_id?: UuidFilter<"Exam"> | string
    topic?: StringFilter<"Exam"> | string
    title?: StringFilter<"Exam"> | string
    exam_start_time?: DateTimeFilter<"Exam"> | Date | string
    exam_end_time?: DateTimeFilter<"Exam"> | Date | string
    duration?: IntFilter<"Exam"> | number
    practice?: BoolFilter<"Exam"> | boolean
    mode?: EnumSelectionModeFilter<"Exam"> | $Enums.SelectionMode
    sample_size?: IntNullableFilter<"Exam"> | number | null
    distribution?: StringNullableFilter<"Exam"> | string | null
    is_public?: BoolFilter<"Exam"> | boolean
    status?: EnumExamStatusFilter<"Exam"> | $Enums.ExamStatus
    submissions?: SubmissionListRelationFilter
    questions?: ExamQuestionsListRelationFilter
    registrations?: ExamRegistrationListRelationFilter
    lecturer?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ExamOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    topic?: SortOrder
    title?: SortOrder
    exam_start_time?: SortOrder
    exam_end_time?: SortOrder
    duration?: SortOrder
    practice?: SortOrder
    mode?: SortOrder
    sample_size?: SortOrderInput | SortOrder
    distribution?: SortOrderInput | SortOrder
    is_public?: SortOrder
    status?: SortOrder
    submissions?: SubmissionOrderByRelationAggregateInput
    questions?: ExamQuestionsOrderByRelationAggregateInput
    registrations?: ExamRegistrationOrderByRelationAggregateInput
    lecturer?: UserOrderByWithRelationInput
  }

  export type ExamWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ExamWhereInput | ExamWhereInput[]
    OR?: ExamWhereInput[]
    NOT?: ExamWhereInput | ExamWhereInput[]
    created_at?: DateTimeFilter<"Exam"> | Date | string
    updated_at?: DateTimeFilter<"Exam"> | Date | string
    lecturer_id?: UuidFilter<"Exam"> | string
    topic?: StringFilter<"Exam"> | string
    title?: StringFilter<"Exam"> | string
    exam_start_time?: DateTimeFilter<"Exam"> | Date | string
    exam_end_time?: DateTimeFilter<"Exam"> | Date | string
    duration?: IntFilter<"Exam"> | number
    practice?: BoolFilter<"Exam"> | boolean
    mode?: EnumSelectionModeFilter<"Exam"> | $Enums.SelectionMode
    sample_size?: IntNullableFilter<"Exam"> | number | null
    distribution?: StringNullableFilter<"Exam"> | string | null
    is_public?: BoolFilter<"Exam"> | boolean
    status?: EnumExamStatusFilter<"Exam"> | $Enums.ExamStatus
    submissions?: SubmissionListRelationFilter
    questions?: ExamQuestionsListRelationFilter
    registrations?: ExamRegistrationListRelationFilter
    lecturer?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type ExamOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    topic?: SortOrder
    title?: SortOrder
    exam_start_time?: SortOrder
    exam_end_time?: SortOrder
    duration?: SortOrder
    practice?: SortOrder
    mode?: SortOrder
    sample_size?: SortOrderInput | SortOrder
    distribution?: SortOrderInput | SortOrder
    is_public?: SortOrder
    status?: SortOrder
    _count?: ExamCountOrderByAggregateInput
    _avg?: ExamAvgOrderByAggregateInput
    _max?: ExamMaxOrderByAggregateInput
    _min?: ExamMinOrderByAggregateInput
    _sum?: ExamSumOrderByAggregateInput
  }

  export type ExamScalarWhereWithAggregatesInput = {
    AND?: ExamScalarWhereWithAggregatesInput | ExamScalarWhereWithAggregatesInput[]
    OR?: ExamScalarWhereWithAggregatesInput[]
    NOT?: ExamScalarWhereWithAggregatesInput | ExamScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Exam"> | string
    created_at?: DateTimeWithAggregatesFilter<"Exam"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Exam"> | Date | string
    lecturer_id?: UuidWithAggregatesFilter<"Exam"> | string
    topic?: StringWithAggregatesFilter<"Exam"> | string
    title?: StringWithAggregatesFilter<"Exam"> | string
    exam_start_time?: DateTimeWithAggregatesFilter<"Exam"> | Date | string
    exam_end_time?: DateTimeWithAggregatesFilter<"Exam"> | Date | string
    duration?: IntWithAggregatesFilter<"Exam"> | number
    practice?: BoolWithAggregatesFilter<"Exam"> | boolean
    mode?: EnumSelectionModeWithAggregatesFilter<"Exam"> | $Enums.SelectionMode
    sample_size?: IntNullableWithAggregatesFilter<"Exam"> | number | null
    distribution?: StringNullableWithAggregatesFilter<"Exam"> | string | null
    is_public?: BoolWithAggregatesFilter<"Exam"> | boolean
    status?: EnumExamStatusWithAggregatesFilter<"Exam"> | $Enums.ExamStatus
  }

  export type SubmissionWhereInput = {
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    id?: UuidFilter<"Submission"> | string
    created_at?: DateTimeFilter<"Submission"> | Date | string
    updated_at?: DateTimeFilter<"Submission"> | Date | string
    exam_id?: UuidFilter<"Submission"> | string
    student_id?: UuidFilter<"Submission"> | string
    total_score?: DecimalNullableFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    rating?: EnumRatingNullableFilter<"Submission"> | $Enums.Rating | null
    start_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    end_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsListRelationFilter
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SubmissionOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    total_score?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    start_time?: SortOrderInput | SortOrder
    end_time?: SortOrderInput | SortOrder
    status?: SortOrder
    questions?: SubmissionQuestionsOrderByRelationAggregateInput
    exam?: ExamOrderByWithRelationInput
    student?: UserOrderByWithRelationInput
  }

  export type SubmissionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SubmissionWhereInput | SubmissionWhereInput[]
    OR?: SubmissionWhereInput[]
    NOT?: SubmissionWhereInput | SubmissionWhereInput[]
    created_at?: DateTimeFilter<"Submission"> | Date | string
    updated_at?: DateTimeFilter<"Submission"> | Date | string
    exam_id?: UuidFilter<"Submission"> | string
    student_id?: UuidFilter<"Submission"> | string
    total_score?: DecimalNullableFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    rating?: EnumRatingNullableFilter<"Submission"> | $Enums.Rating | null
    start_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    end_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsListRelationFilter
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type SubmissionOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    total_score?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    start_time?: SortOrderInput | SortOrder
    end_time?: SortOrderInput | SortOrder
    status?: SortOrder
    _count?: SubmissionCountOrderByAggregateInput
    _avg?: SubmissionAvgOrderByAggregateInput
    _max?: SubmissionMaxOrderByAggregateInput
    _min?: SubmissionMinOrderByAggregateInput
    _sum?: SubmissionSumOrderByAggregateInput
  }

  export type SubmissionScalarWhereWithAggregatesInput = {
    AND?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    OR?: SubmissionScalarWhereWithAggregatesInput[]
    NOT?: SubmissionScalarWhereWithAggregatesInput | SubmissionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Submission"> | string
    created_at?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Submission"> | Date | string
    exam_id?: UuidWithAggregatesFilter<"Submission"> | string
    student_id?: UuidWithAggregatesFilter<"Submission"> | string
    total_score?: DecimalNullableWithAggregatesFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    rating?: EnumRatingNullableWithAggregatesFilter<"Submission"> | $Enums.Rating | null
    start_time?: DateTimeNullableWithAggregatesFilter<"Submission"> | Date | string | null
    end_time?: DateTimeNullableWithAggregatesFilter<"Submission"> | Date | string | null
    status?: EnumSubmissionStatusWithAggregatesFilter<"Submission"> | $Enums.SubmissionStatus
  }

  export type QuestionWhereInput = {
    AND?: QuestionWhereInput | QuestionWhereInput[]
    OR?: QuestionWhereInput[]
    NOT?: QuestionWhereInput | QuestionWhereInput[]
    id?: UuidFilter<"Question"> | string
    created_at?: DateTimeFilter<"Question"> | Date | string
    updated_at?: DateTimeFilter<"Question"> | Date | string
    lecturer_id?: UuidFilter<"Question"> | string
    question_text?: StringFilter<"Question"> | string
    topic?: StringFilter<"Question"> | string
    options?: StringNullableFilter<"Question"> | string | null
    correct_answer?: StringNullableFilter<"Question"> | string | null
    image_url?: StringNullableFilter<"Question"> | string | null
    question_type?: EnumQuestionTypeFilter<"Question"> | $Enums.QuestionType
    question_format?: EnumQuestionFormatFilter<"Question"> | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsListRelationFilter
    exams?: ExamQuestionsListRelationFilter
    lecturer?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type QuestionOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    question_text?: SortOrder
    topic?: SortOrder
    options?: SortOrderInput | SortOrder
    correct_answer?: SortOrderInput | SortOrder
    image_url?: SortOrderInput | SortOrder
    question_type?: SortOrder
    question_format?: SortOrder
    submissions?: SubmissionQuestionsOrderByRelationAggregateInput
    exams?: ExamQuestionsOrderByRelationAggregateInput
    lecturer?: UserOrderByWithRelationInput
  }

  export type QuestionWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: QuestionWhereInput | QuestionWhereInput[]
    OR?: QuestionWhereInput[]
    NOT?: QuestionWhereInput | QuestionWhereInput[]
    created_at?: DateTimeFilter<"Question"> | Date | string
    updated_at?: DateTimeFilter<"Question"> | Date | string
    lecturer_id?: UuidFilter<"Question"> | string
    question_text?: StringFilter<"Question"> | string
    topic?: StringFilter<"Question"> | string
    options?: StringNullableFilter<"Question"> | string | null
    correct_answer?: StringNullableFilter<"Question"> | string | null
    image_url?: StringNullableFilter<"Question"> | string | null
    question_type?: EnumQuestionTypeFilter<"Question"> | $Enums.QuestionType
    question_format?: EnumQuestionFormatFilter<"Question"> | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsListRelationFilter
    exams?: ExamQuestionsListRelationFilter
    lecturer?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type QuestionOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    question_text?: SortOrder
    topic?: SortOrder
    options?: SortOrderInput | SortOrder
    correct_answer?: SortOrderInput | SortOrder
    image_url?: SortOrderInput | SortOrder
    question_type?: SortOrder
    question_format?: SortOrder
    _count?: QuestionCountOrderByAggregateInput
    _max?: QuestionMaxOrderByAggregateInput
    _min?: QuestionMinOrderByAggregateInput
  }

  export type QuestionScalarWhereWithAggregatesInput = {
    AND?: QuestionScalarWhereWithAggregatesInput | QuestionScalarWhereWithAggregatesInput[]
    OR?: QuestionScalarWhereWithAggregatesInput[]
    NOT?: QuestionScalarWhereWithAggregatesInput | QuestionScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Question"> | string
    created_at?: DateTimeWithAggregatesFilter<"Question"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"Question"> | Date | string
    lecturer_id?: UuidWithAggregatesFilter<"Question"> | string
    question_text?: StringWithAggregatesFilter<"Question"> | string
    topic?: StringWithAggregatesFilter<"Question"> | string
    options?: StringNullableWithAggregatesFilter<"Question"> | string | null
    correct_answer?: StringNullableWithAggregatesFilter<"Question"> | string | null
    image_url?: StringNullableWithAggregatesFilter<"Question"> | string | null
    question_type?: EnumQuestionTypeWithAggregatesFilter<"Question"> | $Enums.QuestionType
    question_format?: EnumQuestionFormatWithAggregatesFilter<"Question"> | $Enums.QuestionFormat
  }

  export type ExamQuestionsWhereInput = {
    AND?: ExamQuestionsWhereInput | ExamQuestionsWhereInput[]
    OR?: ExamQuestionsWhereInput[]
    NOT?: ExamQuestionsWhereInput | ExamQuestionsWhereInput[]
    id?: UuidFilter<"ExamQuestions"> | string
    created_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    updated_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    exam_id?: UuidFilter<"ExamQuestions"> | string
    question_id?: UuidFilter<"ExamQuestions"> | string
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    question?: XOR<QuestionScalarRelationFilter, QuestionWhereInput>
  }

  export type ExamQuestionsOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    question_id?: SortOrder
    exam?: ExamOrderByWithRelationInput
    question?: QuestionOrderByWithRelationInput
  }

  export type ExamQuestionsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    exam_id_question_id?: ExamQuestionsExam_idQuestion_idCompoundUniqueInput
    AND?: ExamQuestionsWhereInput | ExamQuestionsWhereInput[]
    OR?: ExamQuestionsWhereInput[]
    NOT?: ExamQuestionsWhereInput | ExamQuestionsWhereInput[]
    created_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    updated_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    exam_id?: UuidFilter<"ExamQuestions"> | string
    question_id?: UuidFilter<"ExamQuestions"> | string
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    question?: XOR<QuestionScalarRelationFilter, QuestionWhereInput>
  }, "id" | "exam_id_question_id">

  export type ExamQuestionsOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    question_id?: SortOrder
    _count?: ExamQuestionsCountOrderByAggregateInput
    _max?: ExamQuestionsMaxOrderByAggregateInput
    _min?: ExamQuestionsMinOrderByAggregateInput
  }

  export type ExamQuestionsScalarWhereWithAggregatesInput = {
    AND?: ExamQuestionsScalarWhereWithAggregatesInput | ExamQuestionsScalarWhereWithAggregatesInput[]
    OR?: ExamQuestionsScalarWhereWithAggregatesInput[]
    NOT?: ExamQuestionsScalarWhereWithAggregatesInput | ExamQuestionsScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ExamQuestions"> | string
    created_at?: DateTimeWithAggregatesFilter<"ExamQuestions"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"ExamQuestions"> | Date | string
    exam_id?: UuidWithAggregatesFilter<"ExamQuestions"> | string
    question_id?: UuidWithAggregatesFilter<"ExamQuestions"> | string
  }

  export type SubmissionQuestionsWhereInput = {
    AND?: SubmissionQuestionsWhereInput | SubmissionQuestionsWhereInput[]
    OR?: SubmissionQuestionsWhereInput[]
    NOT?: SubmissionQuestionsWhereInput | SubmissionQuestionsWhereInput[]
    id?: UuidFilter<"SubmissionQuestions"> | string
    created_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    updated_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    submission_id?: UuidFilter<"SubmissionQuestions"> | string
    question_id?: UuidFilter<"SubmissionQuestions"> | string
    options?: StringNullableFilter<"SubmissionQuestions"> | string | null
    answer?: StringNullableFilter<"SubmissionQuestions"> | string | null
    score?: DecimalNullableFilter<"SubmissionQuestions"> | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFilter<"SubmissionQuestions"> | boolean
    submission?: XOR<SubmissionScalarRelationFilter, SubmissionWhereInput>
    question?: XOR<QuestionScalarRelationFilter, QuestionWhereInput>
  }

  export type SubmissionQuestionsOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    submission_id?: SortOrder
    question_id?: SortOrder
    options?: SortOrderInput | SortOrder
    answer?: SortOrderInput | SortOrder
    score?: SortOrderInput | SortOrder
    is_correct?: SortOrder
    submission?: SubmissionOrderByWithRelationInput
    question?: QuestionOrderByWithRelationInput
  }

  export type SubmissionQuestionsWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    submission_id_question_id?: SubmissionQuestionsSubmission_idQuestion_idCompoundUniqueInput
    AND?: SubmissionQuestionsWhereInput | SubmissionQuestionsWhereInput[]
    OR?: SubmissionQuestionsWhereInput[]
    NOT?: SubmissionQuestionsWhereInput | SubmissionQuestionsWhereInput[]
    created_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    updated_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    submission_id?: UuidFilter<"SubmissionQuestions"> | string
    question_id?: UuidFilter<"SubmissionQuestions"> | string
    options?: StringNullableFilter<"SubmissionQuestions"> | string | null
    answer?: StringNullableFilter<"SubmissionQuestions"> | string | null
    score?: DecimalNullableFilter<"SubmissionQuestions"> | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFilter<"SubmissionQuestions"> | boolean
    submission?: XOR<SubmissionScalarRelationFilter, SubmissionWhereInput>
    question?: XOR<QuestionScalarRelationFilter, QuestionWhereInput>
  }, "id" | "submission_id_question_id">

  export type SubmissionQuestionsOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    submission_id?: SortOrder
    question_id?: SortOrder
    options?: SortOrderInput | SortOrder
    answer?: SortOrderInput | SortOrder
    score?: SortOrderInput | SortOrder
    is_correct?: SortOrder
    _count?: SubmissionQuestionsCountOrderByAggregateInput
    _avg?: SubmissionQuestionsAvgOrderByAggregateInput
    _max?: SubmissionQuestionsMaxOrderByAggregateInput
    _min?: SubmissionQuestionsMinOrderByAggregateInput
    _sum?: SubmissionQuestionsSumOrderByAggregateInput
  }

  export type SubmissionQuestionsScalarWhereWithAggregatesInput = {
    AND?: SubmissionQuestionsScalarWhereWithAggregatesInput | SubmissionQuestionsScalarWhereWithAggregatesInput[]
    OR?: SubmissionQuestionsScalarWhereWithAggregatesInput[]
    NOT?: SubmissionQuestionsScalarWhereWithAggregatesInput | SubmissionQuestionsScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"SubmissionQuestions"> | string
    created_at?: DateTimeWithAggregatesFilter<"SubmissionQuestions"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"SubmissionQuestions"> | Date | string
    submission_id?: UuidWithAggregatesFilter<"SubmissionQuestions"> | string
    question_id?: UuidWithAggregatesFilter<"SubmissionQuestions"> | string
    options?: StringNullableWithAggregatesFilter<"SubmissionQuestions"> | string | null
    answer?: StringNullableWithAggregatesFilter<"SubmissionQuestions"> | string | null
    score?: DecimalNullableWithAggregatesFilter<"SubmissionQuestions"> | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolWithAggregatesFilter<"SubmissionQuestions"> | boolean
  }

  export type ExamRegistrationWhereInput = {
    AND?: ExamRegistrationWhereInput | ExamRegistrationWhereInput[]
    OR?: ExamRegistrationWhereInput[]
    NOT?: ExamRegistrationWhereInput | ExamRegistrationWhereInput[]
    id?: UuidFilter<"ExamRegistration"> | string
    created_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    updated_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    exam_id?: UuidFilter<"ExamRegistration"> | string
    student_id?: UuidFilter<"ExamRegistration"> | string
    status?: EnumRegistrationStatusFilter<"ExamRegistration"> | $Enums.RegistrationStatus
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ExamRegistrationOrderByWithRelationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    status?: SortOrder
    exam?: ExamOrderByWithRelationInput
    student?: UserOrderByWithRelationInput
  }

  export type ExamRegistrationWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    exam_id_student_id?: ExamRegistrationExam_idStudent_idCompoundUniqueInput
    AND?: ExamRegistrationWhereInput | ExamRegistrationWhereInput[]
    OR?: ExamRegistrationWhereInput[]
    NOT?: ExamRegistrationWhereInput | ExamRegistrationWhereInput[]
    created_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    updated_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    exam_id?: UuidFilter<"ExamRegistration"> | string
    student_id?: UuidFilter<"ExamRegistration"> | string
    status?: EnumRegistrationStatusFilter<"ExamRegistration"> | $Enums.RegistrationStatus
    exam?: XOR<ExamScalarRelationFilter, ExamWhereInput>
    student?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "exam_id_student_id">

  export type ExamRegistrationOrderByWithAggregationInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    status?: SortOrder
    _count?: ExamRegistrationCountOrderByAggregateInput
    _max?: ExamRegistrationMaxOrderByAggregateInput
    _min?: ExamRegistrationMinOrderByAggregateInput
  }

  export type ExamRegistrationScalarWhereWithAggregatesInput = {
    AND?: ExamRegistrationScalarWhereWithAggregatesInput | ExamRegistrationScalarWhereWithAggregatesInput[]
    OR?: ExamRegistrationScalarWhereWithAggregatesInput[]
    NOT?: ExamRegistrationScalarWhereWithAggregatesInput | ExamRegistrationScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ExamRegistration"> | string
    created_at?: DateTimeWithAggregatesFilter<"ExamRegistration"> | Date | string
    updated_at?: DateTimeWithAggregatesFilter<"ExamRegistration"> | Date | string
    exam_id?: UuidWithAggregatesFilter<"ExamRegistration"> | string
    student_id?: UuidWithAggregatesFilter<"ExamRegistration"> | string
    status?: EnumRegistrationStatusWithAggregatesFilter<"ExamRegistration"> | $Enums.RegistrationStatus
  }

  export type UserCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamCreateNestedManyWithoutLecturerInput
    questions?: QuestionCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamUncheckedCreateNestedManyWithoutLecturerInput
    questions?: QuestionUncheckedCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUncheckedUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUncheckedUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ExamCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationCreateNestedManyWithoutExamInput
    lecturer: UserCreateNestedOneWithoutExamsInput
  }

  export type ExamUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionUncheckedCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsUncheckedCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutExamInput
  }

  export type ExamUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutExamNestedInput
    lecturer?: UserUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUncheckedUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUncheckedUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutExamNestedInput
  }

  export type ExamCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
  }

  export type ExamUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
  }

  export type ExamUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
  }

  export type SubmissionCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsCreateNestedManyWithoutSubmissionInput
    exam: ExamCreateNestedOneWithoutSubmissionsInput
    student: UserCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    student_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutSubmissionInput
  }

  export type SubmissionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUpdateManyWithoutSubmissionNestedInput
    exam?: ExamUpdateOneRequiredWithoutSubmissionsNestedInput
    student?: UserUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    student_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionNestedInput
  }

  export type SubmissionCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    student_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
  }

  export type SubmissionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
  }

  export type SubmissionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    student_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
  }

  export type QuestionCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsCreateNestedManyWithoutQuestionInput
    exams?: ExamQuestionsCreateNestedManyWithoutQuestionInput
    lecturer: UserCreateNestedOneWithoutQuestionsInput
  }

  export type QuestionUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutQuestionInput
    exams?: ExamQuestionsUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type QuestionUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUpdateManyWithoutQuestionNestedInput
    exams?: ExamQuestionsUpdateManyWithoutQuestionNestedInput
    lecturer?: UserUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type QuestionUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
    exams?: ExamQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type QuestionCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
  }

  export type QuestionUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
  }

  export type QuestionUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
  }

  export type ExamQuestionsCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam: ExamCreateNestedOneWithoutQuestionsInput
    question: QuestionCreateNestedOneWithoutExamsInput
  }

  export type ExamQuestionsUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    question_id: string
  }

  export type ExamQuestionsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam?: ExamUpdateOneRequiredWithoutQuestionsNestedInput
    question?: QuestionUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamQuestionsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    question_id?: StringFieldUpdateOperationsInput | string
  }

  export type ExamQuestionsCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    question_id: string
  }

  export type ExamQuestionsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ExamQuestionsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    question_id?: StringFieldUpdateOperationsInput | string
  }

  export type SubmissionQuestionsCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
    submission: SubmissionCreateNestedOneWithoutQuestionsInput
    question: QuestionCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionQuestionsUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    submission_id: string
    question_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type SubmissionQuestionsUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
    submission?: SubmissionUpdateOneRequiredWithoutQuestionsNestedInput
    question?: QuestionUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionQuestionsUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    submission_id?: StringFieldUpdateOperationsInput | string
    question_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type SubmissionQuestionsCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    submission_id: string
    question_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type SubmissionQuestionsUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type SubmissionQuestionsUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    submission_id?: StringFieldUpdateOperationsInput | string
    question_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ExamRegistrationCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    status?: $Enums.RegistrationStatus
    exam: ExamCreateNestedOneWithoutRegistrationsInput
    student: UserCreateNestedOneWithoutRegistrationsInput
  }

  export type ExamRegistrationUncheckedCreateInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    student_id: string
    status?: $Enums.RegistrationStatus
  }

  export type ExamRegistrationUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
    exam?: ExamUpdateOneRequiredWithoutRegistrationsNestedInput
    student?: UserUpdateOneRequiredWithoutRegistrationsNestedInput
  }

  export type ExamRegistrationUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    student_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type ExamRegistrationCreateManyInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    student_id: string
    status?: $Enums.RegistrationStatus
  }

  export type ExamRegistrationUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type ExamRegistrationUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    student_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type ExamListRelationFilter = {
    every?: ExamWhereInput
    some?: ExamWhereInput
    none?: ExamWhereInput
  }

  export type QuestionListRelationFilter = {
    every?: QuestionWhereInput
    some?: QuestionWhereInput
    none?: QuestionWhereInput
  }

  export type SubmissionListRelationFilter = {
    every?: SubmissionWhereInput
    some?: SubmissionWhereInput
    none?: SubmissionWhereInput
  }

  export type ExamRegistrationListRelationFilter = {
    every?: ExamRegistrationWhereInput
    some?: ExamRegistrationWhereInput
    none?: ExamRegistrationWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ExamOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type QuestionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SubmissionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ExamRegistrationOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    full_name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    auth_provider?: SortOrder
    provider_id?: SortOrder
    school?: SortOrder
    phone?: SortOrder
    address?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    full_name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    auth_provider?: SortOrder
    provider_id?: SortOrder
    school?: SortOrder
    phone?: SortOrder
    address?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    full_name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    auth_provider?: SortOrder
    provider_id?: SortOrder
    school?: SortOrder
    phone?: SortOrder
    address?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumSelectionModeFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectionMode | EnumSelectionModeFieldRefInput<$PrismaModel>
    in?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectionModeFilter<$PrismaModel> | $Enums.SelectionMode
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type EnumExamStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ExamStatus | EnumExamStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumExamStatusFilter<$PrismaModel> | $Enums.ExamStatus
  }

  export type ExamQuestionsListRelationFilter = {
    every?: ExamQuestionsWhereInput
    some?: ExamQuestionsWhereInput
    none?: ExamQuestionsWhereInput
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type ExamQuestionsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ExamCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    topic?: SortOrder
    title?: SortOrder
    exam_start_time?: SortOrder
    exam_end_time?: SortOrder
    duration?: SortOrder
    practice?: SortOrder
    mode?: SortOrder
    sample_size?: SortOrder
    distribution?: SortOrder
    is_public?: SortOrder
    status?: SortOrder
  }

  export type ExamAvgOrderByAggregateInput = {
    duration?: SortOrder
    sample_size?: SortOrder
  }

  export type ExamMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    topic?: SortOrder
    title?: SortOrder
    exam_start_time?: SortOrder
    exam_end_time?: SortOrder
    duration?: SortOrder
    practice?: SortOrder
    mode?: SortOrder
    sample_size?: SortOrder
    distribution?: SortOrder
    is_public?: SortOrder
    status?: SortOrder
  }

  export type ExamMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    topic?: SortOrder
    title?: SortOrder
    exam_start_time?: SortOrder
    exam_end_time?: SortOrder
    duration?: SortOrder
    practice?: SortOrder
    mode?: SortOrder
    sample_size?: SortOrder
    distribution?: SortOrder
    is_public?: SortOrder
    status?: SortOrder
  }

  export type ExamSumOrderByAggregateInput = {
    duration?: SortOrder
    sample_size?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumSelectionModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectionMode | EnumSelectionModeFieldRefInput<$PrismaModel>
    in?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectionModeWithAggregatesFilter<$PrismaModel> | $Enums.SelectionMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSelectionModeFilter<$PrismaModel>
    _max?: NestedEnumSelectionModeFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type EnumExamStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ExamStatus | EnumExamStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumExamStatusWithAggregatesFilter<$PrismaModel> | $Enums.ExamStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumExamStatusFilter<$PrismaModel>
    _max?: NestedEnumExamStatusFilter<$PrismaModel>
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type EnumRatingNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Rating | EnumRatingFieldRefInput<$PrismaModel> | null
    in?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRatingNullableFilter<$PrismaModel> | $Enums.Rating | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type EnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }

  export type SubmissionQuestionsListRelationFilter = {
    every?: SubmissionQuestionsWhereInput
    some?: SubmissionQuestionsWhereInput
    none?: SubmissionQuestionsWhereInput
  }

  export type ExamScalarRelationFilter = {
    is?: ExamWhereInput
    isNot?: ExamWhereInput
  }

  export type SubmissionQuestionsOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SubmissionCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    total_score?: SortOrder
    rating?: SortOrder
    start_time?: SortOrder
    end_time?: SortOrder
    status?: SortOrder
  }

  export type SubmissionAvgOrderByAggregateInput = {
    total_score?: SortOrder
  }

  export type SubmissionMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    total_score?: SortOrder
    rating?: SortOrder
    start_time?: SortOrder
    end_time?: SortOrder
    status?: SortOrder
  }

  export type SubmissionMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    total_score?: SortOrder
    rating?: SortOrder
    start_time?: SortOrder
    end_time?: SortOrder
    status?: SortOrder
  }

  export type SubmissionSumOrderByAggregateInput = {
    total_score?: SortOrder
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type EnumRatingNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Rating | EnumRatingFieldRefInput<$PrismaModel> | null
    in?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRatingNullableWithAggregatesFilter<$PrismaModel> | $Enums.Rating | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRatingNullableFilter<$PrismaModel>
    _max?: NestedEnumRatingNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type EnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type EnumQuestionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionType | EnumQuestionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionTypeFilter<$PrismaModel> | $Enums.QuestionType
  }

  export type EnumQuestionFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionFormat | EnumQuestionFormatFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionFormatFilter<$PrismaModel> | $Enums.QuestionFormat
  }

  export type QuestionCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    question_text?: SortOrder
    topic?: SortOrder
    options?: SortOrder
    correct_answer?: SortOrder
    image_url?: SortOrder
    question_type?: SortOrder
    question_format?: SortOrder
  }

  export type QuestionMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    question_text?: SortOrder
    topic?: SortOrder
    options?: SortOrder
    correct_answer?: SortOrder
    image_url?: SortOrder
    question_type?: SortOrder
    question_format?: SortOrder
  }

  export type QuestionMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    lecturer_id?: SortOrder
    question_text?: SortOrder
    topic?: SortOrder
    options?: SortOrder
    correct_answer?: SortOrder
    image_url?: SortOrder
    question_type?: SortOrder
    question_format?: SortOrder
  }

  export type EnumQuestionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionType | EnumQuestionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionTypeWithAggregatesFilter<$PrismaModel> | $Enums.QuestionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumQuestionTypeFilter<$PrismaModel>
    _max?: NestedEnumQuestionTypeFilter<$PrismaModel>
  }

  export type EnumQuestionFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionFormat | EnumQuestionFormatFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionFormatWithAggregatesFilter<$PrismaModel> | $Enums.QuestionFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumQuestionFormatFilter<$PrismaModel>
    _max?: NestedEnumQuestionFormatFilter<$PrismaModel>
  }

  export type QuestionScalarRelationFilter = {
    is?: QuestionWhereInput
    isNot?: QuestionWhereInput
  }

  export type ExamQuestionsExam_idQuestion_idCompoundUniqueInput = {
    exam_id: string
    question_id: string
  }

  export type ExamQuestionsCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    question_id?: SortOrder
  }

  export type ExamQuestionsMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    question_id?: SortOrder
  }

  export type ExamQuestionsMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    question_id?: SortOrder
  }

  export type SubmissionScalarRelationFilter = {
    is?: SubmissionWhereInput
    isNot?: SubmissionWhereInput
  }

  export type SubmissionQuestionsSubmission_idQuestion_idCompoundUniqueInput = {
    submission_id: string
    question_id: string
  }

  export type SubmissionQuestionsCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    submission_id?: SortOrder
    question_id?: SortOrder
    options?: SortOrder
    answer?: SortOrder
    score?: SortOrder
    is_correct?: SortOrder
  }

  export type SubmissionQuestionsAvgOrderByAggregateInput = {
    score?: SortOrder
  }

  export type SubmissionQuestionsMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    submission_id?: SortOrder
    question_id?: SortOrder
    options?: SortOrder
    answer?: SortOrder
    score?: SortOrder
    is_correct?: SortOrder
  }

  export type SubmissionQuestionsMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    submission_id?: SortOrder
    question_id?: SortOrder
    options?: SortOrder
    answer?: SortOrder
    score?: SortOrder
    is_correct?: SortOrder
  }

  export type SubmissionQuestionsSumOrderByAggregateInput = {
    score?: SortOrder
  }

  export type EnumRegistrationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RegistrationStatus | EnumRegistrationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRegistrationStatusFilter<$PrismaModel> | $Enums.RegistrationStatus
  }

  export type ExamRegistrationExam_idStudent_idCompoundUniqueInput = {
    exam_id: string
    student_id: string
  }

  export type ExamRegistrationCountOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    status?: SortOrder
  }

  export type ExamRegistrationMaxOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    status?: SortOrder
  }

  export type ExamRegistrationMinOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    exam_id?: SortOrder
    student_id?: SortOrder
    status?: SortOrder
  }

  export type EnumRegistrationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RegistrationStatus | EnumRegistrationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRegistrationStatusWithAggregatesFilter<$PrismaModel> | $Enums.RegistrationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRegistrationStatusFilter<$PrismaModel>
    _max?: NestedEnumRegistrationStatusFilter<$PrismaModel>
  }

  export type ExamCreateNestedManyWithoutLecturerInput = {
    create?: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput> | ExamCreateWithoutLecturerInput[] | ExamUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: ExamCreateOrConnectWithoutLecturerInput | ExamCreateOrConnectWithoutLecturerInput[]
    createMany?: ExamCreateManyLecturerInputEnvelope
    connect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
  }

  export type QuestionCreateNestedManyWithoutLecturerInput = {
    create?: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput> | QuestionCreateWithoutLecturerInput[] | QuestionUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: QuestionCreateOrConnectWithoutLecturerInput | QuestionCreateOrConnectWithoutLecturerInput[]
    createMany?: QuestionCreateManyLecturerInputEnvelope
    connect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
  }

  export type SubmissionCreateNestedManyWithoutStudentInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type ExamRegistrationCreateNestedManyWithoutStudentInput = {
    create?: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput> | ExamRegistrationCreateWithoutStudentInput[] | ExamRegistrationUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutStudentInput | ExamRegistrationCreateOrConnectWithoutStudentInput[]
    createMany?: ExamRegistrationCreateManyStudentInputEnvelope
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
  }

  export type ExamUncheckedCreateNestedManyWithoutLecturerInput = {
    create?: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput> | ExamCreateWithoutLecturerInput[] | ExamUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: ExamCreateOrConnectWithoutLecturerInput | ExamCreateOrConnectWithoutLecturerInput[]
    createMany?: ExamCreateManyLecturerInputEnvelope
    connect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
  }

  export type QuestionUncheckedCreateNestedManyWithoutLecturerInput = {
    create?: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput> | QuestionCreateWithoutLecturerInput[] | QuestionUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: QuestionCreateOrConnectWithoutLecturerInput | QuestionCreateOrConnectWithoutLecturerInput[]
    createMany?: QuestionCreateManyLecturerInputEnvelope
    connect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
  }

  export type SubmissionUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type ExamRegistrationUncheckedCreateNestedManyWithoutStudentInput = {
    create?: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput> | ExamRegistrationCreateWithoutStudentInput[] | ExamRegistrationUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutStudentInput | ExamRegistrationCreateOrConnectWithoutStudentInput[]
    createMany?: ExamRegistrationCreateManyStudentInputEnvelope
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type ExamUpdateManyWithoutLecturerNestedInput = {
    create?: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput> | ExamCreateWithoutLecturerInput[] | ExamUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: ExamCreateOrConnectWithoutLecturerInput | ExamCreateOrConnectWithoutLecturerInput[]
    upsert?: ExamUpsertWithWhereUniqueWithoutLecturerInput | ExamUpsertWithWhereUniqueWithoutLecturerInput[]
    createMany?: ExamCreateManyLecturerInputEnvelope
    set?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    disconnect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    delete?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    connect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    update?: ExamUpdateWithWhereUniqueWithoutLecturerInput | ExamUpdateWithWhereUniqueWithoutLecturerInput[]
    updateMany?: ExamUpdateManyWithWhereWithoutLecturerInput | ExamUpdateManyWithWhereWithoutLecturerInput[]
    deleteMany?: ExamScalarWhereInput | ExamScalarWhereInput[]
  }

  export type QuestionUpdateManyWithoutLecturerNestedInput = {
    create?: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput> | QuestionCreateWithoutLecturerInput[] | QuestionUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: QuestionCreateOrConnectWithoutLecturerInput | QuestionCreateOrConnectWithoutLecturerInput[]
    upsert?: QuestionUpsertWithWhereUniqueWithoutLecturerInput | QuestionUpsertWithWhereUniqueWithoutLecturerInput[]
    createMany?: QuestionCreateManyLecturerInputEnvelope
    set?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    disconnect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    delete?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    connect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    update?: QuestionUpdateWithWhereUniqueWithoutLecturerInput | QuestionUpdateWithWhereUniqueWithoutLecturerInput[]
    updateMany?: QuestionUpdateManyWithWhereWithoutLecturerInput | QuestionUpdateManyWithWhereWithoutLecturerInput[]
    deleteMany?: QuestionScalarWhereInput | QuestionScalarWhereInput[]
  }

  export type SubmissionUpdateManyWithoutStudentNestedInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutStudentInput | SubmissionUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutStudentInput | SubmissionUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutStudentInput | SubmissionUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type ExamRegistrationUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput> | ExamRegistrationCreateWithoutStudentInput[] | ExamRegistrationUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutStudentInput | ExamRegistrationCreateOrConnectWithoutStudentInput[]
    upsert?: ExamRegistrationUpsertWithWhereUniqueWithoutStudentInput | ExamRegistrationUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ExamRegistrationCreateManyStudentInputEnvelope
    set?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    disconnect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    delete?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    update?: ExamRegistrationUpdateWithWhereUniqueWithoutStudentInput | ExamRegistrationUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ExamRegistrationUpdateManyWithWhereWithoutStudentInput | ExamRegistrationUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
  }

  export type ExamUncheckedUpdateManyWithoutLecturerNestedInput = {
    create?: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput> | ExamCreateWithoutLecturerInput[] | ExamUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: ExamCreateOrConnectWithoutLecturerInput | ExamCreateOrConnectWithoutLecturerInput[]
    upsert?: ExamUpsertWithWhereUniqueWithoutLecturerInput | ExamUpsertWithWhereUniqueWithoutLecturerInput[]
    createMany?: ExamCreateManyLecturerInputEnvelope
    set?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    disconnect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    delete?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    connect?: ExamWhereUniqueInput | ExamWhereUniqueInput[]
    update?: ExamUpdateWithWhereUniqueWithoutLecturerInput | ExamUpdateWithWhereUniqueWithoutLecturerInput[]
    updateMany?: ExamUpdateManyWithWhereWithoutLecturerInput | ExamUpdateManyWithWhereWithoutLecturerInput[]
    deleteMany?: ExamScalarWhereInput | ExamScalarWhereInput[]
  }

  export type QuestionUncheckedUpdateManyWithoutLecturerNestedInput = {
    create?: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput> | QuestionCreateWithoutLecturerInput[] | QuestionUncheckedCreateWithoutLecturerInput[]
    connectOrCreate?: QuestionCreateOrConnectWithoutLecturerInput | QuestionCreateOrConnectWithoutLecturerInput[]
    upsert?: QuestionUpsertWithWhereUniqueWithoutLecturerInput | QuestionUpsertWithWhereUniqueWithoutLecturerInput[]
    createMany?: QuestionCreateManyLecturerInputEnvelope
    set?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    disconnect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    delete?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    connect?: QuestionWhereUniqueInput | QuestionWhereUniqueInput[]
    update?: QuestionUpdateWithWhereUniqueWithoutLecturerInput | QuestionUpdateWithWhereUniqueWithoutLecturerInput[]
    updateMany?: QuestionUpdateManyWithWhereWithoutLecturerInput | QuestionUpdateManyWithWhereWithoutLecturerInput[]
    deleteMany?: QuestionScalarWhereInput | QuestionScalarWhereInput[]
  }

  export type SubmissionUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput> | SubmissionCreateWithoutStudentInput[] | SubmissionUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutStudentInput | SubmissionCreateOrConnectWithoutStudentInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutStudentInput | SubmissionUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: SubmissionCreateManyStudentInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutStudentInput | SubmissionUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutStudentInput | SubmissionUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type ExamRegistrationUncheckedUpdateManyWithoutStudentNestedInput = {
    create?: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput> | ExamRegistrationCreateWithoutStudentInput[] | ExamRegistrationUncheckedCreateWithoutStudentInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutStudentInput | ExamRegistrationCreateOrConnectWithoutStudentInput[]
    upsert?: ExamRegistrationUpsertWithWhereUniqueWithoutStudentInput | ExamRegistrationUpsertWithWhereUniqueWithoutStudentInput[]
    createMany?: ExamRegistrationCreateManyStudentInputEnvelope
    set?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    disconnect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    delete?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    update?: ExamRegistrationUpdateWithWhereUniqueWithoutStudentInput | ExamRegistrationUpdateWithWhereUniqueWithoutStudentInput[]
    updateMany?: ExamRegistrationUpdateManyWithWhereWithoutStudentInput | ExamRegistrationUpdateManyWithWhereWithoutStudentInput[]
    deleteMany?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
  }

  export type SubmissionCreateNestedManyWithoutExamInput = {
    create?: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput> | SubmissionCreateWithoutExamInput[] | SubmissionUncheckedCreateWithoutExamInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutExamInput | SubmissionCreateOrConnectWithoutExamInput[]
    createMany?: SubmissionCreateManyExamInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type ExamQuestionsCreateNestedManyWithoutExamInput = {
    create?: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput> | ExamQuestionsCreateWithoutExamInput[] | ExamQuestionsUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutExamInput | ExamQuestionsCreateOrConnectWithoutExamInput[]
    createMany?: ExamQuestionsCreateManyExamInputEnvelope
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
  }

  export type ExamRegistrationCreateNestedManyWithoutExamInput = {
    create?: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput> | ExamRegistrationCreateWithoutExamInput[] | ExamRegistrationUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutExamInput | ExamRegistrationCreateOrConnectWithoutExamInput[]
    createMany?: ExamRegistrationCreateManyExamInputEnvelope
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutExamsInput = {
    create?: XOR<UserCreateWithoutExamsInput, UserUncheckedCreateWithoutExamsInput>
    connectOrCreate?: UserCreateOrConnectWithoutExamsInput
    connect?: UserWhereUniqueInput
  }

  export type SubmissionUncheckedCreateNestedManyWithoutExamInput = {
    create?: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput> | SubmissionCreateWithoutExamInput[] | SubmissionUncheckedCreateWithoutExamInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutExamInput | SubmissionCreateOrConnectWithoutExamInput[]
    createMany?: SubmissionCreateManyExamInputEnvelope
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
  }

  export type ExamQuestionsUncheckedCreateNestedManyWithoutExamInput = {
    create?: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput> | ExamQuestionsCreateWithoutExamInput[] | ExamQuestionsUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutExamInput | ExamQuestionsCreateOrConnectWithoutExamInput[]
    createMany?: ExamQuestionsCreateManyExamInputEnvelope
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
  }

  export type ExamRegistrationUncheckedCreateNestedManyWithoutExamInput = {
    create?: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput> | ExamRegistrationCreateWithoutExamInput[] | ExamRegistrationUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutExamInput | ExamRegistrationCreateOrConnectWithoutExamInput[]
    createMany?: ExamRegistrationCreateManyExamInputEnvelope
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumSelectionModeFieldUpdateOperationsInput = {
    set?: $Enums.SelectionMode
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumExamStatusFieldUpdateOperationsInput = {
    set?: $Enums.ExamStatus
  }

  export type SubmissionUpdateManyWithoutExamNestedInput = {
    create?: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput> | SubmissionCreateWithoutExamInput[] | SubmissionUncheckedCreateWithoutExamInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutExamInput | SubmissionCreateOrConnectWithoutExamInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutExamInput | SubmissionUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: SubmissionCreateManyExamInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutExamInput | SubmissionUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutExamInput | SubmissionUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type ExamQuestionsUpdateManyWithoutExamNestedInput = {
    create?: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput> | ExamQuestionsCreateWithoutExamInput[] | ExamQuestionsUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutExamInput | ExamQuestionsCreateOrConnectWithoutExamInput[]
    upsert?: ExamQuestionsUpsertWithWhereUniqueWithoutExamInput | ExamQuestionsUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: ExamQuestionsCreateManyExamInputEnvelope
    set?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    disconnect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    delete?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    update?: ExamQuestionsUpdateWithWhereUniqueWithoutExamInput | ExamQuestionsUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: ExamQuestionsUpdateManyWithWhereWithoutExamInput | ExamQuestionsUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
  }

  export type ExamRegistrationUpdateManyWithoutExamNestedInput = {
    create?: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput> | ExamRegistrationCreateWithoutExamInput[] | ExamRegistrationUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutExamInput | ExamRegistrationCreateOrConnectWithoutExamInput[]
    upsert?: ExamRegistrationUpsertWithWhereUniqueWithoutExamInput | ExamRegistrationUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: ExamRegistrationCreateManyExamInputEnvelope
    set?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    disconnect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    delete?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    update?: ExamRegistrationUpdateWithWhereUniqueWithoutExamInput | ExamRegistrationUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: ExamRegistrationUpdateManyWithWhereWithoutExamInput | ExamRegistrationUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutExamsNestedInput = {
    create?: XOR<UserCreateWithoutExamsInput, UserUncheckedCreateWithoutExamsInput>
    connectOrCreate?: UserCreateOrConnectWithoutExamsInput
    upsert?: UserUpsertWithoutExamsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutExamsInput, UserUpdateWithoutExamsInput>, UserUncheckedUpdateWithoutExamsInput>
  }

  export type SubmissionUncheckedUpdateManyWithoutExamNestedInput = {
    create?: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput> | SubmissionCreateWithoutExamInput[] | SubmissionUncheckedCreateWithoutExamInput[]
    connectOrCreate?: SubmissionCreateOrConnectWithoutExamInput | SubmissionCreateOrConnectWithoutExamInput[]
    upsert?: SubmissionUpsertWithWhereUniqueWithoutExamInput | SubmissionUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: SubmissionCreateManyExamInputEnvelope
    set?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    disconnect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    delete?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    connect?: SubmissionWhereUniqueInput | SubmissionWhereUniqueInput[]
    update?: SubmissionUpdateWithWhereUniqueWithoutExamInput | SubmissionUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: SubmissionUpdateManyWithWhereWithoutExamInput | SubmissionUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
  }

  export type ExamQuestionsUncheckedUpdateManyWithoutExamNestedInput = {
    create?: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput> | ExamQuestionsCreateWithoutExamInput[] | ExamQuestionsUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutExamInput | ExamQuestionsCreateOrConnectWithoutExamInput[]
    upsert?: ExamQuestionsUpsertWithWhereUniqueWithoutExamInput | ExamQuestionsUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: ExamQuestionsCreateManyExamInputEnvelope
    set?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    disconnect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    delete?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    update?: ExamQuestionsUpdateWithWhereUniqueWithoutExamInput | ExamQuestionsUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: ExamQuestionsUpdateManyWithWhereWithoutExamInput | ExamQuestionsUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
  }

  export type ExamRegistrationUncheckedUpdateManyWithoutExamNestedInput = {
    create?: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput> | ExamRegistrationCreateWithoutExamInput[] | ExamRegistrationUncheckedCreateWithoutExamInput[]
    connectOrCreate?: ExamRegistrationCreateOrConnectWithoutExamInput | ExamRegistrationCreateOrConnectWithoutExamInput[]
    upsert?: ExamRegistrationUpsertWithWhereUniqueWithoutExamInput | ExamRegistrationUpsertWithWhereUniqueWithoutExamInput[]
    createMany?: ExamRegistrationCreateManyExamInputEnvelope
    set?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    disconnect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    delete?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    connect?: ExamRegistrationWhereUniqueInput | ExamRegistrationWhereUniqueInput[]
    update?: ExamRegistrationUpdateWithWhereUniqueWithoutExamInput | ExamRegistrationUpdateWithWhereUniqueWithoutExamInput[]
    updateMany?: ExamRegistrationUpdateManyWithWhereWithoutExamInput | ExamRegistrationUpdateManyWithWhereWithoutExamInput[]
    deleteMany?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
  }

  export type SubmissionQuestionsCreateNestedManyWithoutSubmissionInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput> | SubmissionQuestionsCreateWithoutSubmissionInput[] | SubmissionQuestionsUncheckedCreateWithoutSubmissionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutSubmissionInput | SubmissionQuestionsCreateOrConnectWithoutSubmissionInput[]
    createMany?: SubmissionQuestionsCreateManySubmissionInputEnvelope
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
  }

  export type ExamCreateNestedOneWithoutSubmissionsInput = {
    create?: XOR<ExamCreateWithoutSubmissionsInput, ExamUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutSubmissionsInput
    connect?: ExamWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutSubmissionsInput = {
    create?: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubmissionsInput
    connect?: UserWhereUniqueInput
  }

  export type SubmissionQuestionsUncheckedCreateNestedManyWithoutSubmissionInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput> | SubmissionQuestionsCreateWithoutSubmissionInput[] | SubmissionQuestionsUncheckedCreateWithoutSubmissionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutSubmissionInput | SubmissionQuestionsCreateOrConnectWithoutSubmissionInput[]
    createMany?: SubmissionQuestionsCreateManySubmissionInputEnvelope
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableEnumRatingFieldUpdateOperationsInput = {
    set?: $Enums.Rating | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type EnumSubmissionStatusFieldUpdateOperationsInput = {
    set?: $Enums.SubmissionStatus
  }

  export type SubmissionQuestionsUpdateManyWithoutSubmissionNestedInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput> | SubmissionQuestionsCreateWithoutSubmissionInput[] | SubmissionQuestionsUncheckedCreateWithoutSubmissionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutSubmissionInput | SubmissionQuestionsCreateOrConnectWithoutSubmissionInput[]
    upsert?: SubmissionQuestionsUpsertWithWhereUniqueWithoutSubmissionInput | SubmissionQuestionsUpsertWithWhereUniqueWithoutSubmissionInput[]
    createMany?: SubmissionQuestionsCreateManySubmissionInputEnvelope
    set?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    disconnect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    delete?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    update?: SubmissionQuestionsUpdateWithWhereUniqueWithoutSubmissionInput | SubmissionQuestionsUpdateWithWhereUniqueWithoutSubmissionInput[]
    updateMany?: SubmissionQuestionsUpdateManyWithWhereWithoutSubmissionInput | SubmissionQuestionsUpdateManyWithWhereWithoutSubmissionInput[]
    deleteMany?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
  }

  export type ExamUpdateOneRequiredWithoutSubmissionsNestedInput = {
    create?: XOR<ExamCreateWithoutSubmissionsInput, ExamUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutSubmissionsInput
    upsert?: ExamUpsertWithoutSubmissionsInput
    connect?: ExamWhereUniqueInput
    update?: XOR<XOR<ExamUpdateToOneWithWhereWithoutSubmissionsInput, ExamUpdateWithoutSubmissionsInput>, ExamUncheckedUpdateWithoutSubmissionsInput>
  }

  export type UserUpdateOneRequiredWithoutSubmissionsNestedInput = {
    create?: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSubmissionsInput
    upsert?: UserUpsertWithoutSubmissionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSubmissionsInput, UserUpdateWithoutSubmissionsInput>, UserUncheckedUpdateWithoutSubmissionsInput>
  }

  export type SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionNestedInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput> | SubmissionQuestionsCreateWithoutSubmissionInput[] | SubmissionQuestionsUncheckedCreateWithoutSubmissionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutSubmissionInput | SubmissionQuestionsCreateOrConnectWithoutSubmissionInput[]
    upsert?: SubmissionQuestionsUpsertWithWhereUniqueWithoutSubmissionInput | SubmissionQuestionsUpsertWithWhereUniqueWithoutSubmissionInput[]
    createMany?: SubmissionQuestionsCreateManySubmissionInputEnvelope
    set?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    disconnect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    delete?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    update?: SubmissionQuestionsUpdateWithWhereUniqueWithoutSubmissionInput | SubmissionQuestionsUpdateWithWhereUniqueWithoutSubmissionInput[]
    updateMany?: SubmissionQuestionsUpdateManyWithWhereWithoutSubmissionInput | SubmissionQuestionsUpdateManyWithWhereWithoutSubmissionInput[]
    deleteMany?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
  }

  export type SubmissionQuestionsCreateNestedManyWithoutQuestionInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput> | SubmissionQuestionsCreateWithoutQuestionInput[] | SubmissionQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutQuestionInput | SubmissionQuestionsCreateOrConnectWithoutQuestionInput[]
    createMany?: SubmissionQuestionsCreateManyQuestionInputEnvelope
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
  }

  export type ExamQuestionsCreateNestedManyWithoutQuestionInput = {
    create?: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput> | ExamQuestionsCreateWithoutQuestionInput[] | ExamQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutQuestionInput | ExamQuestionsCreateOrConnectWithoutQuestionInput[]
    createMany?: ExamQuestionsCreateManyQuestionInputEnvelope
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
  }

  export type UserCreateNestedOneWithoutQuestionsInput = {
    create?: XOR<UserCreateWithoutQuestionsInput, UserUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutQuestionsInput
    connect?: UserWhereUniqueInput
  }

  export type SubmissionQuestionsUncheckedCreateNestedManyWithoutQuestionInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput> | SubmissionQuestionsCreateWithoutQuestionInput[] | SubmissionQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutQuestionInput | SubmissionQuestionsCreateOrConnectWithoutQuestionInput[]
    createMany?: SubmissionQuestionsCreateManyQuestionInputEnvelope
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
  }

  export type ExamQuestionsUncheckedCreateNestedManyWithoutQuestionInput = {
    create?: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput> | ExamQuestionsCreateWithoutQuestionInput[] | ExamQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutQuestionInput | ExamQuestionsCreateOrConnectWithoutQuestionInput[]
    createMany?: ExamQuestionsCreateManyQuestionInputEnvelope
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
  }

  export type EnumQuestionTypeFieldUpdateOperationsInput = {
    set?: $Enums.QuestionType
  }

  export type EnumQuestionFormatFieldUpdateOperationsInput = {
    set?: $Enums.QuestionFormat
  }

  export type SubmissionQuestionsUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput> | SubmissionQuestionsCreateWithoutQuestionInput[] | SubmissionQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutQuestionInput | SubmissionQuestionsCreateOrConnectWithoutQuestionInput[]
    upsert?: SubmissionQuestionsUpsertWithWhereUniqueWithoutQuestionInput | SubmissionQuestionsUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: SubmissionQuestionsCreateManyQuestionInputEnvelope
    set?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    disconnect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    delete?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    update?: SubmissionQuestionsUpdateWithWhereUniqueWithoutQuestionInput | SubmissionQuestionsUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: SubmissionQuestionsUpdateManyWithWhereWithoutQuestionInput | SubmissionQuestionsUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
  }

  export type ExamQuestionsUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput> | ExamQuestionsCreateWithoutQuestionInput[] | ExamQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutQuestionInput | ExamQuestionsCreateOrConnectWithoutQuestionInput[]
    upsert?: ExamQuestionsUpsertWithWhereUniqueWithoutQuestionInput | ExamQuestionsUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: ExamQuestionsCreateManyQuestionInputEnvelope
    set?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    disconnect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    delete?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    update?: ExamQuestionsUpdateWithWhereUniqueWithoutQuestionInput | ExamQuestionsUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: ExamQuestionsUpdateManyWithWhereWithoutQuestionInput | ExamQuestionsUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
  }

  export type UserUpdateOneRequiredWithoutQuestionsNestedInput = {
    create?: XOR<UserCreateWithoutQuestionsInput, UserUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutQuestionsInput
    upsert?: UserUpsertWithoutQuestionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutQuestionsInput, UserUpdateWithoutQuestionsInput>, UserUncheckedUpdateWithoutQuestionsInput>
  }

  export type SubmissionQuestionsUncheckedUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput> | SubmissionQuestionsCreateWithoutQuestionInput[] | SubmissionQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: SubmissionQuestionsCreateOrConnectWithoutQuestionInput | SubmissionQuestionsCreateOrConnectWithoutQuestionInput[]
    upsert?: SubmissionQuestionsUpsertWithWhereUniqueWithoutQuestionInput | SubmissionQuestionsUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: SubmissionQuestionsCreateManyQuestionInputEnvelope
    set?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    disconnect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    delete?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    connect?: SubmissionQuestionsWhereUniqueInput | SubmissionQuestionsWhereUniqueInput[]
    update?: SubmissionQuestionsUpdateWithWhereUniqueWithoutQuestionInput | SubmissionQuestionsUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: SubmissionQuestionsUpdateManyWithWhereWithoutQuestionInput | SubmissionQuestionsUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
  }

  export type ExamQuestionsUncheckedUpdateManyWithoutQuestionNestedInput = {
    create?: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput> | ExamQuestionsCreateWithoutQuestionInput[] | ExamQuestionsUncheckedCreateWithoutQuestionInput[]
    connectOrCreate?: ExamQuestionsCreateOrConnectWithoutQuestionInput | ExamQuestionsCreateOrConnectWithoutQuestionInput[]
    upsert?: ExamQuestionsUpsertWithWhereUniqueWithoutQuestionInput | ExamQuestionsUpsertWithWhereUniqueWithoutQuestionInput[]
    createMany?: ExamQuestionsCreateManyQuestionInputEnvelope
    set?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    disconnect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    delete?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    connect?: ExamQuestionsWhereUniqueInput | ExamQuestionsWhereUniqueInput[]
    update?: ExamQuestionsUpdateWithWhereUniqueWithoutQuestionInput | ExamQuestionsUpdateWithWhereUniqueWithoutQuestionInput[]
    updateMany?: ExamQuestionsUpdateManyWithWhereWithoutQuestionInput | ExamQuestionsUpdateManyWithWhereWithoutQuestionInput[]
    deleteMany?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
  }

  export type ExamCreateNestedOneWithoutQuestionsInput = {
    create?: XOR<ExamCreateWithoutQuestionsInput, ExamUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutQuestionsInput
    connect?: ExamWhereUniqueInput
  }

  export type QuestionCreateNestedOneWithoutExamsInput = {
    create?: XOR<QuestionCreateWithoutExamsInput, QuestionUncheckedCreateWithoutExamsInput>
    connectOrCreate?: QuestionCreateOrConnectWithoutExamsInput
    connect?: QuestionWhereUniqueInput
  }

  export type ExamUpdateOneRequiredWithoutQuestionsNestedInput = {
    create?: XOR<ExamCreateWithoutQuestionsInput, ExamUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutQuestionsInput
    upsert?: ExamUpsertWithoutQuestionsInput
    connect?: ExamWhereUniqueInput
    update?: XOR<XOR<ExamUpdateToOneWithWhereWithoutQuestionsInput, ExamUpdateWithoutQuestionsInput>, ExamUncheckedUpdateWithoutQuestionsInput>
  }

  export type QuestionUpdateOneRequiredWithoutExamsNestedInput = {
    create?: XOR<QuestionCreateWithoutExamsInput, QuestionUncheckedCreateWithoutExamsInput>
    connectOrCreate?: QuestionCreateOrConnectWithoutExamsInput
    upsert?: QuestionUpsertWithoutExamsInput
    connect?: QuestionWhereUniqueInput
    update?: XOR<XOR<QuestionUpdateToOneWithWhereWithoutExamsInput, QuestionUpdateWithoutExamsInput>, QuestionUncheckedUpdateWithoutExamsInput>
  }

  export type SubmissionCreateNestedOneWithoutQuestionsInput = {
    create?: XOR<SubmissionCreateWithoutQuestionsInput, SubmissionUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: SubmissionCreateOrConnectWithoutQuestionsInput
    connect?: SubmissionWhereUniqueInput
  }

  export type QuestionCreateNestedOneWithoutSubmissionsInput = {
    create?: XOR<QuestionCreateWithoutSubmissionsInput, QuestionUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: QuestionCreateOrConnectWithoutSubmissionsInput
    connect?: QuestionWhereUniqueInput
  }

  export type SubmissionUpdateOneRequiredWithoutQuestionsNestedInput = {
    create?: XOR<SubmissionCreateWithoutQuestionsInput, SubmissionUncheckedCreateWithoutQuestionsInput>
    connectOrCreate?: SubmissionCreateOrConnectWithoutQuestionsInput
    upsert?: SubmissionUpsertWithoutQuestionsInput
    connect?: SubmissionWhereUniqueInput
    update?: XOR<XOR<SubmissionUpdateToOneWithWhereWithoutQuestionsInput, SubmissionUpdateWithoutQuestionsInput>, SubmissionUncheckedUpdateWithoutQuestionsInput>
  }

  export type QuestionUpdateOneRequiredWithoutSubmissionsNestedInput = {
    create?: XOR<QuestionCreateWithoutSubmissionsInput, QuestionUncheckedCreateWithoutSubmissionsInput>
    connectOrCreate?: QuestionCreateOrConnectWithoutSubmissionsInput
    upsert?: QuestionUpsertWithoutSubmissionsInput
    connect?: QuestionWhereUniqueInput
    update?: XOR<XOR<QuestionUpdateToOneWithWhereWithoutSubmissionsInput, QuestionUpdateWithoutSubmissionsInput>, QuestionUncheckedUpdateWithoutSubmissionsInput>
  }

  export type ExamCreateNestedOneWithoutRegistrationsInput = {
    create?: XOR<ExamCreateWithoutRegistrationsInput, ExamUncheckedCreateWithoutRegistrationsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutRegistrationsInput
    connect?: ExamWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutRegistrationsInput = {
    create?: XOR<UserCreateWithoutRegistrationsInput, UserUncheckedCreateWithoutRegistrationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRegistrationsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumRegistrationStatusFieldUpdateOperationsInput = {
    set?: $Enums.RegistrationStatus
  }

  export type ExamUpdateOneRequiredWithoutRegistrationsNestedInput = {
    create?: XOR<ExamCreateWithoutRegistrationsInput, ExamUncheckedCreateWithoutRegistrationsInput>
    connectOrCreate?: ExamCreateOrConnectWithoutRegistrationsInput
    upsert?: ExamUpsertWithoutRegistrationsInput
    connect?: ExamWhereUniqueInput
    update?: XOR<XOR<ExamUpdateToOneWithWhereWithoutRegistrationsInput, ExamUpdateWithoutRegistrationsInput>, ExamUncheckedUpdateWithoutRegistrationsInput>
  }

  export type UserUpdateOneRequiredWithoutRegistrationsNestedInput = {
    create?: XOR<UserCreateWithoutRegistrationsInput, UserUncheckedCreateWithoutRegistrationsInput>
    connectOrCreate?: UserCreateOrConnectWithoutRegistrationsInput
    upsert?: UserUpsertWithoutRegistrationsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutRegistrationsInput, UserUpdateWithoutRegistrationsInput>, UserUncheckedUpdateWithoutRegistrationsInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumSelectionModeFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectionMode | EnumSelectionModeFieldRefInput<$PrismaModel>
    in?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectionModeFilter<$PrismaModel> | $Enums.SelectionMode
  }

  export type NestedEnumExamStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ExamStatus | EnumExamStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumExamStatusFilter<$PrismaModel> | $Enums.ExamStatus
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumSelectionModeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SelectionMode | EnumSelectionModeFieldRefInput<$PrismaModel>
    in?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    notIn?: $Enums.SelectionMode[] | ListEnumSelectionModeFieldRefInput<$PrismaModel>
    not?: NestedEnumSelectionModeWithAggregatesFilter<$PrismaModel> | $Enums.SelectionMode
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSelectionModeFilter<$PrismaModel>
    _max?: NestedEnumSelectionModeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumExamStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ExamStatus | EnumExamStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ExamStatus[] | ListEnumExamStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumExamStatusWithAggregatesFilter<$PrismaModel> | $Enums.ExamStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumExamStatusFilter<$PrismaModel>
    _max?: NestedEnumExamStatusFilter<$PrismaModel>
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedEnumRatingNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Rating | EnumRatingFieldRefInput<$PrismaModel> | null
    in?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRatingNullableFilter<$PrismaModel> | $Enums.Rating | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumSubmissionStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusFilter<$PrismaModel> | $Enums.SubmissionStatus
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedEnumRatingNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Rating | EnumRatingFieldRefInput<$PrismaModel> | null
    in?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.Rating[] | ListEnumRatingFieldRefInput<$PrismaModel> | null
    not?: NestedEnumRatingNullableWithAggregatesFilter<$PrismaModel> | $Enums.Rating | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumRatingNullableFilter<$PrismaModel>
    _max?: NestedEnumRatingNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.SubmissionStatus | EnumSubmissionStatusFieldRefInput<$PrismaModel>
    in?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.SubmissionStatus[] | ListEnumSubmissionStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumSubmissionStatusWithAggregatesFilter<$PrismaModel> | $Enums.SubmissionStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumSubmissionStatusFilter<$PrismaModel>
    _max?: NestedEnumSubmissionStatusFilter<$PrismaModel>
  }

  export type NestedEnumQuestionTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionType | EnumQuestionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionTypeFilter<$PrismaModel> | $Enums.QuestionType
  }

  export type NestedEnumQuestionFormatFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionFormat | EnumQuestionFormatFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionFormatFilter<$PrismaModel> | $Enums.QuestionFormat
  }

  export type NestedEnumQuestionTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionType | EnumQuestionTypeFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionType[] | ListEnumQuestionTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionTypeWithAggregatesFilter<$PrismaModel> | $Enums.QuestionType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumQuestionTypeFilter<$PrismaModel>
    _max?: NestedEnumQuestionTypeFilter<$PrismaModel>
  }

  export type NestedEnumQuestionFormatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.QuestionFormat | EnumQuestionFormatFieldRefInput<$PrismaModel>
    in?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    notIn?: $Enums.QuestionFormat[] | ListEnumQuestionFormatFieldRefInput<$PrismaModel>
    not?: NestedEnumQuestionFormatWithAggregatesFilter<$PrismaModel> | $Enums.QuestionFormat
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumQuestionFormatFilter<$PrismaModel>
    _max?: NestedEnumQuestionFormatFilter<$PrismaModel>
  }

  export type NestedEnumRegistrationStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.RegistrationStatus | EnumRegistrationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRegistrationStatusFilter<$PrismaModel> | $Enums.RegistrationStatus
  }

  export type NestedEnumRegistrationStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.RegistrationStatus | EnumRegistrationStatusFieldRefInput<$PrismaModel>
    in?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.RegistrationStatus[] | ListEnumRegistrationStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumRegistrationStatusWithAggregatesFilter<$PrismaModel> | $Enums.RegistrationStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRegistrationStatusFilter<$PrismaModel>
    _max?: NestedEnumRegistrationStatusFilter<$PrismaModel>
  }

  export type ExamCreateWithoutLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationCreateNestedManyWithoutExamInput
  }

  export type ExamUncheckedCreateWithoutLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionUncheckedCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsUncheckedCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutExamInput
  }

  export type ExamCreateOrConnectWithoutLecturerInput = {
    where: ExamWhereUniqueInput
    create: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput>
  }

  export type ExamCreateManyLecturerInputEnvelope = {
    data: ExamCreateManyLecturerInput | ExamCreateManyLecturerInput[]
    skipDuplicates?: boolean
  }

  export type QuestionCreateWithoutLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsCreateNestedManyWithoutQuestionInput
    exams?: ExamQuestionsCreateNestedManyWithoutQuestionInput
  }

  export type QuestionUncheckedCreateWithoutLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutQuestionInput
    exams?: ExamQuestionsUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type QuestionCreateOrConnectWithoutLecturerInput = {
    where: QuestionWhereUniqueInput
    create: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput>
  }

  export type QuestionCreateManyLecturerInputEnvelope = {
    data: QuestionCreateManyLecturerInput | QuestionCreateManyLecturerInput[]
    skipDuplicates?: boolean
  }

  export type SubmissionCreateWithoutStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsCreateNestedManyWithoutSubmissionInput
    exam: ExamCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateWithoutStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutSubmissionInput
  }

  export type SubmissionCreateOrConnectWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    create: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput>
  }

  export type SubmissionCreateManyStudentInputEnvelope = {
    data: SubmissionCreateManyStudentInput | SubmissionCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type ExamRegistrationCreateWithoutStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    status?: $Enums.RegistrationStatus
    exam: ExamCreateNestedOneWithoutRegistrationsInput
  }

  export type ExamRegistrationUncheckedCreateWithoutStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    status?: $Enums.RegistrationStatus
  }

  export type ExamRegistrationCreateOrConnectWithoutStudentInput = {
    where: ExamRegistrationWhereUniqueInput
    create: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput>
  }

  export type ExamRegistrationCreateManyStudentInputEnvelope = {
    data: ExamRegistrationCreateManyStudentInput | ExamRegistrationCreateManyStudentInput[]
    skipDuplicates?: boolean
  }

  export type ExamUpsertWithWhereUniqueWithoutLecturerInput = {
    where: ExamWhereUniqueInput
    update: XOR<ExamUpdateWithoutLecturerInput, ExamUncheckedUpdateWithoutLecturerInput>
    create: XOR<ExamCreateWithoutLecturerInput, ExamUncheckedCreateWithoutLecturerInput>
  }

  export type ExamUpdateWithWhereUniqueWithoutLecturerInput = {
    where: ExamWhereUniqueInput
    data: XOR<ExamUpdateWithoutLecturerInput, ExamUncheckedUpdateWithoutLecturerInput>
  }

  export type ExamUpdateManyWithWhereWithoutLecturerInput = {
    where: ExamScalarWhereInput
    data: XOR<ExamUpdateManyMutationInput, ExamUncheckedUpdateManyWithoutLecturerInput>
  }

  export type ExamScalarWhereInput = {
    AND?: ExamScalarWhereInput | ExamScalarWhereInput[]
    OR?: ExamScalarWhereInput[]
    NOT?: ExamScalarWhereInput | ExamScalarWhereInput[]
    id?: UuidFilter<"Exam"> | string
    created_at?: DateTimeFilter<"Exam"> | Date | string
    updated_at?: DateTimeFilter<"Exam"> | Date | string
    lecturer_id?: UuidFilter<"Exam"> | string
    topic?: StringFilter<"Exam"> | string
    title?: StringFilter<"Exam"> | string
    exam_start_time?: DateTimeFilter<"Exam"> | Date | string
    exam_end_time?: DateTimeFilter<"Exam"> | Date | string
    duration?: IntFilter<"Exam"> | number
    practice?: BoolFilter<"Exam"> | boolean
    mode?: EnumSelectionModeFilter<"Exam"> | $Enums.SelectionMode
    sample_size?: IntNullableFilter<"Exam"> | number | null
    distribution?: StringNullableFilter<"Exam"> | string | null
    is_public?: BoolFilter<"Exam"> | boolean
    status?: EnumExamStatusFilter<"Exam"> | $Enums.ExamStatus
  }

  export type QuestionUpsertWithWhereUniqueWithoutLecturerInput = {
    where: QuestionWhereUniqueInput
    update: XOR<QuestionUpdateWithoutLecturerInput, QuestionUncheckedUpdateWithoutLecturerInput>
    create: XOR<QuestionCreateWithoutLecturerInput, QuestionUncheckedCreateWithoutLecturerInput>
  }

  export type QuestionUpdateWithWhereUniqueWithoutLecturerInput = {
    where: QuestionWhereUniqueInput
    data: XOR<QuestionUpdateWithoutLecturerInput, QuestionUncheckedUpdateWithoutLecturerInput>
  }

  export type QuestionUpdateManyWithWhereWithoutLecturerInput = {
    where: QuestionScalarWhereInput
    data: XOR<QuestionUpdateManyMutationInput, QuestionUncheckedUpdateManyWithoutLecturerInput>
  }

  export type QuestionScalarWhereInput = {
    AND?: QuestionScalarWhereInput | QuestionScalarWhereInput[]
    OR?: QuestionScalarWhereInput[]
    NOT?: QuestionScalarWhereInput | QuestionScalarWhereInput[]
    id?: UuidFilter<"Question"> | string
    created_at?: DateTimeFilter<"Question"> | Date | string
    updated_at?: DateTimeFilter<"Question"> | Date | string
    lecturer_id?: UuidFilter<"Question"> | string
    question_text?: StringFilter<"Question"> | string
    topic?: StringFilter<"Question"> | string
    options?: StringNullableFilter<"Question"> | string | null
    correct_answer?: StringNullableFilter<"Question"> | string | null
    image_url?: StringNullableFilter<"Question"> | string | null
    question_type?: EnumQuestionTypeFilter<"Question"> | $Enums.QuestionType
    question_format?: EnumQuestionFormatFilter<"Question"> | $Enums.QuestionFormat
  }

  export type SubmissionUpsertWithWhereUniqueWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    update: XOR<SubmissionUpdateWithoutStudentInput, SubmissionUncheckedUpdateWithoutStudentInput>
    create: XOR<SubmissionCreateWithoutStudentInput, SubmissionUncheckedCreateWithoutStudentInput>
  }

  export type SubmissionUpdateWithWhereUniqueWithoutStudentInput = {
    where: SubmissionWhereUniqueInput
    data: XOR<SubmissionUpdateWithoutStudentInput, SubmissionUncheckedUpdateWithoutStudentInput>
  }

  export type SubmissionUpdateManyWithWhereWithoutStudentInput = {
    where: SubmissionScalarWhereInput
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyWithoutStudentInput>
  }

  export type SubmissionScalarWhereInput = {
    AND?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
    OR?: SubmissionScalarWhereInput[]
    NOT?: SubmissionScalarWhereInput | SubmissionScalarWhereInput[]
    id?: UuidFilter<"Submission"> | string
    created_at?: DateTimeFilter<"Submission"> | Date | string
    updated_at?: DateTimeFilter<"Submission"> | Date | string
    exam_id?: UuidFilter<"Submission"> | string
    student_id?: UuidFilter<"Submission"> | string
    total_score?: DecimalNullableFilter<"Submission"> | Decimal | DecimalJsLike | number | string | null
    rating?: EnumRatingNullableFilter<"Submission"> | $Enums.Rating | null
    start_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    end_time?: DateTimeNullableFilter<"Submission"> | Date | string | null
    status?: EnumSubmissionStatusFilter<"Submission"> | $Enums.SubmissionStatus
  }

  export type ExamRegistrationUpsertWithWhereUniqueWithoutStudentInput = {
    where: ExamRegistrationWhereUniqueInput
    update: XOR<ExamRegistrationUpdateWithoutStudentInput, ExamRegistrationUncheckedUpdateWithoutStudentInput>
    create: XOR<ExamRegistrationCreateWithoutStudentInput, ExamRegistrationUncheckedCreateWithoutStudentInput>
  }

  export type ExamRegistrationUpdateWithWhereUniqueWithoutStudentInput = {
    where: ExamRegistrationWhereUniqueInput
    data: XOR<ExamRegistrationUpdateWithoutStudentInput, ExamRegistrationUncheckedUpdateWithoutStudentInput>
  }

  export type ExamRegistrationUpdateManyWithWhereWithoutStudentInput = {
    where: ExamRegistrationScalarWhereInput
    data: XOR<ExamRegistrationUpdateManyMutationInput, ExamRegistrationUncheckedUpdateManyWithoutStudentInput>
  }

  export type ExamRegistrationScalarWhereInput = {
    AND?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
    OR?: ExamRegistrationScalarWhereInput[]
    NOT?: ExamRegistrationScalarWhereInput | ExamRegistrationScalarWhereInput[]
    id?: UuidFilter<"ExamRegistration"> | string
    created_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    updated_at?: DateTimeFilter<"ExamRegistration"> | Date | string
    exam_id?: UuidFilter<"ExamRegistration"> | string
    student_id?: UuidFilter<"ExamRegistration"> | string
    status?: EnumRegistrationStatusFilter<"ExamRegistration"> | $Enums.RegistrationStatus
  }

  export type SubmissionCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsCreateNestedManyWithoutSubmissionInput
    student: UserCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    student_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutSubmissionInput
  }

  export type SubmissionCreateOrConnectWithoutExamInput = {
    where: SubmissionWhereUniqueInput
    create: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput>
  }

  export type SubmissionCreateManyExamInputEnvelope = {
    data: SubmissionCreateManyExamInput | SubmissionCreateManyExamInput[]
    skipDuplicates?: boolean
  }

  export type ExamQuestionsCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question: QuestionCreateNestedOneWithoutExamsInput
  }

  export type ExamQuestionsUncheckedCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_id: string
  }

  export type ExamQuestionsCreateOrConnectWithoutExamInput = {
    where: ExamQuestionsWhereUniqueInput
    create: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput>
  }

  export type ExamQuestionsCreateManyExamInputEnvelope = {
    data: ExamQuestionsCreateManyExamInput | ExamQuestionsCreateManyExamInput[]
    skipDuplicates?: boolean
  }

  export type ExamRegistrationCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    status?: $Enums.RegistrationStatus
    student: UserCreateNestedOneWithoutRegistrationsInput
  }

  export type ExamRegistrationUncheckedCreateWithoutExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    student_id: string
    status?: $Enums.RegistrationStatus
  }

  export type ExamRegistrationCreateOrConnectWithoutExamInput = {
    where: ExamRegistrationWhereUniqueInput
    create: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput>
  }

  export type ExamRegistrationCreateManyExamInputEnvelope = {
    data: ExamRegistrationCreateManyExamInput | ExamRegistrationCreateManyExamInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutExamsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    questions?: QuestionCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateWithoutExamsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    questions?: QuestionUncheckedCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserCreateOrConnectWithoutExamsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutExamsInput, UserUncheckedCreateWithoutExamsInput>
  }

  export type SubmissionUpsertWithWhereUniqueWithoutExamInput = {
    where: SubmissionWhereUniqueInput
    update: XOR<SubmissionUpdateWithoutExamInput, SubmissionUncheckedUpdateWithoutExamInput>
    create: XOR<SubmissionCreateWithoutExamInput, SubmissionUncheckedCreateWithoutExamInput>
  }

  export type SubmissionUpdateWithWhereUniqueWithoutExamInput = {
    where: SubmissionWhereUniqueInput
    data: XOR<SubmissionUpdateWithoutExamInput, SubmissionUncheckedUpdateWithoutExamInput>
  }

  export type SubmissionUpdateManyWithWhereWithoutExamInput = {
    where: SubmissionScalarWhereInput
    data: XOR<SubmissionUpdateManyMutationInput, SubmissionUncheckedUpdateManyWithoutExamInput>
  }

  export type ExamQuestionsUpsertWithWhereUniqueWithoutExamInput = {
    where: ExamQuestionsWhereUniqueInput
    update: XOR<ExamQuestionsUpdateWithoutExamInput, ExamQuestionsUncheckedUpdateWithoutExamInput>
    create: XOR<ExamQuestionsCreateWithoutExamInput, ExamQuestionsUncheckedCreateWithoutExamInput>
  }

  export type ExamQuestionsUpdateWithWhereUniqueWithoutExamInput = {
    where: ExamQuestionsWhereUniqueInput
    data: XOR<ExamQuestionsUpdateWithoutExamInput, ExamQuestionsUncheckedUpdateWithoutExamInput>
  }

  export type ExamQuestionsUpdateManyWithWhereWithoutExamInput = {
    where: ExamQuestionsScalarWhereInput
    data: XOR<ExamQuestionsUpdateManyMutationInput, ExamQuestionsUncheckedUpdateManyWithoutExamInput>
  }

  export type ExamQuestionsScalarWhereInput = {
    AND?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
    OR?: ExamQuestionsScalarWhereInput[]
    NOT?: ExamQuestionsScalarWhereInput | ExamQuestionsScalarWhereInput[]
    id?: UuidFilter<"ExamQuestions"> | string
    created_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    updated_at?: DateTimeFilter<"ExamQuestions"> | Date | string
    exam_id?: UuidFilter<"ExamQuestions"> | string
    question_id?: UuidFilter<"ExamQuestions"> | string
  }

  export type ExamRegistrationUpsertWithWhereUniqueWithoutExamInput = {
    where: ExamRegistrationWhereUniqueInput
    update: XOR<ExamRegistrationUpdateWithoutExamInput, ExamRegistrationUncheckedUpdateWithoutExamInput>
    create: XOR<ExamRegistrationCreateWithoutExamInput, ExamRegistrationUncheckedCreateWithoutExamInput>
  }

  export type ExamRegistrationUpdateWithWhereUniqueWithoutExamInput = {
    where: ExamRegistrationWhereUniqueInput
    data: XOR<ExamRegistrationUpdateWithoutExamInput, ExamRegistrationUncheckedUpdateWithoutExamInput>
  }

  export type ExamRegistrationUpdateManyWithWhereWithoutExamInput = {
    where: ExamRegistrationScalarWhereInput
    data: XOR<ExamRegistrationUpdateManyMutationInput, ExamRegistrationUncheckedUpdateManyWithoutExamInput>
  }

  export type UserUpsertWithoutExamsInput = {
    update: XOR<UserUpdateWithoutExamsInput, UserUncheckedUpdateWithoutExamsInput>
    create: XOR<UserCreateWithoutExamsInput, UserUncheckedCreateWithoutExamsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutExamsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutExamsInput, UserUncheckedUpdateWithoutExamsInput>
  }

  export type UserUpdateWithoutExamsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: QuestionUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateWithoutExamsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    questions?: QuestionUncheckedUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type SubmissionQuestionsCreateWithoutSubmissionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
    question: QuestionCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionQuestionsUncheckedCreateWithoutSubmissionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type SubmissionQuestionsCreateOrConnectWithoutSubmissionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    create: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput>
  }

  export type SubmissionQuestionsCreateManySubmissionInputEnvelope = {
    data: SubmissionQuestionsCreateManySubmissionInput | SubmissionQuestionsCreateManySubmissionInput[]
    skipDuplicates?: boolean
  }

  export type ExamCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    questions?: ExamQuestionsCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationCreateNestedManyWithoutExamInput
    lecturer: UserCreateNestedOneWithoutExamsInput
  }

  export type ExamUncheckedCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    questions?: ExamQuestionsUncheckedCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutExamInput
  }

  export type ExamCreateOrConnectWithoutSubmissionsInput = {
    where: ExamWhereUniqueInput
    create: XOR<ExamCreateWithoutSubmissionsInput, ExamUncheckedCreateWithoutSubmissionsInput>
  }

  export type UserCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamCreateNestedManyWithoutLecturerInput
    questions?: QuestionCreateNestedManyWithoutLecturerInput
    registrations?: ExamRegistrationCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamUncheckedCreateNestedManyWithoutLecturerInput
    questions?: QuestionUncheckedCreateNestedManyWithoutLecturerInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserCreateOrConnectWithoutSubmissionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
  }

  export type SubmissionQuestionsUpsertWithWhereUniqueWithoutSubmissionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    update: XOR<SubmissionQuestionsUpdateWithoutSubmissionInput, SubmissionQuestionsUncheckedUpdateWithoutSubmissionInput>
    create: XOR<SubmissionQuestionsCreateWithoutSubmissionInput, SubmissionQuestionsUncheckedCreateWithoutSubmissionInput>
  }

  export type SubmissionQuestionsUpdateWithWhereUniqueWithoutSubmissionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    data: XOR<SubmissionQuestionsUpdateWithoutSubmissionInput, SubmissionQuestionsUncheckedUpdateWithoutSubmissionInput>
  }

  export type SubmissionQuestionsUpdateManyWithWhereWithoutSubmissionInput = {
    where: SubmissionQuestionsScalarWhereInput
    data: XOR<SubmissionQuestionsUpdateManyMutationInput, SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionInput>
  }

  export type SubmissionQuestionsScalarWhereInput = {
    AND?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
    OR?: SubmissionQuestionsScalarWhereInput[]
    NOT?: SubmissionQuestionsScalarWhereInput | SubmissionQuestionsScalarWhereInput[]
    id?: UuidFilter<"SubmissionQuestions"> | string
    created_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    updated_at?: DateTimeFilter<"SubmissionQuestions"> | Date | string
    submission_id?: UuidFilter<"SubmissionQuestions"> | string
    question_id?: UuidFilter<"SubmissionQuestions"> | string
    options?: StringNullableFilter<"SubmissionQuestions"> | string | null
    answer?: StringNullableFilter<"SubmissionQuestions"> | string | null
    score?: DecimalNullableFilter<"SubmissionQuestions"> | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFilter<"SubmissionQuestions"> | boolean
  }

  export type ExamUpsertWithoutSubmissionsInput = {
    update: XOR<ExamUpdateWithoutSubmissionsInput, ExamUncheckedUpdateWithoutSubmissionsInput>
    create: XOR<ExamCreateWithoutSubmissionsInput, ExamUncheckedCreateWithoutSubmissionsInput>
    where?: ExamWhereInput
  }

  export type ExamUpdateToOneWithWhereWithoutSubmissionsInput = {
    where?: ExamWhereInput
    data: XOR<ExamUpdateWithoutSubmissionsInput, ExamUncheckedUpdateWithoutSubmissionsInput>
  }

  export type ExamUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    questions?: ExamQuestionsUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutExamNestedInput
    lecturer?: UserUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamUncheckedUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    questions?: ExamQuestionsUncheckedUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutExamNestedInput
  }

  export type UserUpsertWithoutSubmissionsInput = {
    update: XOR<UserUpdateWithoutSubmissionsInput, UserUncheckedUpdateWithoutSubmissionsInput>
    create: XOR<UserCreateWithoutSubmissionsInput, UserUncheckedCreateWithoutSubmissionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSubmissionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSubmissionsInput, UserUncheckedUpdateWithoutSubmissionsInput>
  }

  export type UserUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUpdateManyWithoutLecturerNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUncheckedUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUncheckedUpdateManyWithoutLecturerNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type SubmissionQuestionsCreateWithoutQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
    submission: SubmissionCreateNestedOneWithoutQuestionsInput
  }

  export type SubmissionQuestionsUncheckedCreateWithoutQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    submission_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type SubmissionQuestionsCreateOrConnectWithoutQuestionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    create: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput>
  }

  export type SubmissionQuestionsCreateManyQuestionInputEnvelope = {
    data: SubmissionQuestionsCreateManyQuestionInput | SubmissionQuestionsCreateManyQuestionInput[]
    skipDuplicates?: boolean
  }

  export type ExamQuestionsCreateWithoutQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam: ExamCreateNestedOneWithoutQuestionsInput
  }

  export type ExamQuestionsUncheckedCreateWithoutQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
  }

  export type ExamQuestionsCreateOrConnectWithoutQuestionInput = {
    where: ExamQuestionsWhereUniqueInput
    create: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput>
  }

  export type ExamQuestionsCreateManyQuestionInputEnvelope = {
    data: ExamQuestionsCreateManyQuestionInput | ExamQuestionsCreateManyQuestionInput[]
    skipDuplicates?: boolean
  }

  export type UserCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamUncheckedCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserCreateOrConnectWithoutQuestionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutQuestionsInput, UserUncheckedCreateWithoutQuestionsInput>
  }

  export type SubmissionQuestionsUpsertWithWhereUniqueWithoutQuestionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    update: XOR<SubmissionQuestionsUpdateWithoutQuestionInput, SubmissionQuestionsUncheckedUpdateWithoutQuestionInput>
    create: XOR<SubmissionQuestionsCreateWithoutQuestionInput, SubmissionQuestionsUncheckedCreateWithoutQuestionInput>
  }

  export type SubmissionQuestionsUpdateWithWhereUniqueWithoutQuestionInput = {
    where: SubmissionQuestionsWhereUniqueInput
    data: XOR<SubmissionQuestionsUpdateWithoutQuestionInput, SubmissionQuestionsUncheckedUpdateWithoutQuestionInput>
  }

  export type SubmissionQuestionsUpdateManyWithWhereWithoutQuestionInput = {
    where: SubmissionQuestionsScalarWhereInput
    data: XOR<SubmissionQuestionsUpdateManyMutationInput, SubmissionQuestionsUncheckedUpdateManyWithoutQuestionInput>
  }

  export type ExamQuestionsUpsertWithWhereUniqueWithoutQuestionInput = {
    where: ExamQuestionsWhereUniqueInput
    update: XOR<ExamQuestionsUpdateWithoutQuestionInput, ExamQuestionsUncheckedUpdateWithoutQuestionInput>
    create: XOR<ExamQuestionsCreateWithoutQuestionInput, ExamQuestionsUncheckedCreateWithoutQuestionInput>
  }

  export type ExamQuestionsUpdateWithWhereUniqueWithoutQuestionInput = {
    where: ExamQuestionsWhereUniqueInput
    data: XOR<ExamQuestionsUpdateWithoutQuestionInput, ExamQuestionsUncheckedUpdateWithoutQuestionInput>
  }

  export type ExamQuestionsUpdateManyWithWhereWithoutQuestionInput = {
    where: ExamQuestionsScalarWhereInput
    data: XOR<ExamQuestionsUpdateManyMutationInput, ExamQuestionsUncheckedUpdateManyWithoutQuestionInput>
  }

  export type UserUpsertWithoutQuestionsInput = {
    update: XOR<UserUpdateWithoutQuestionsInput, UserUncheckedUpdateWithoutQuestionsInput>
    create: XOR<UserCreateWithoutQuestionsInput, UserUncheckedCreateWithoutQuestionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutQuestionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutQuestionsInput, UserUncheckedUpdateWithoutQuestionsInput>
  }

  export type UserUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUncheckedUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type ExamCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationCreateNestedManyWithoutExamInput
    lecturer: UserCreateNestedOneWithoutExamsInput
  }

  export type ExamUncheckedCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionUncheckedCreateNestedManyWithoutExamInput
    registrations?: ExamRegistrationUncheckedCreateNestedManyWithoutExamInput
  }

  export type ExamCreateOrConnectWithoutQuestionsInput = {
    where: ExamWhereUniqueInput
    create: XOR<ExamCreateWithoutQuestionsInput, ExamUncheckedCreateWithoutQuestionsInput>
  }

  export type QuestionCreateWithoutExamsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsCreateNestedManyWithoutQuestionInput
    lecturer: UserCreateNestedOneWithoutQuestionsInput
  }

  export type QuestionUncheckedCreateWithoutExamsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type QuestionCreateOrConnectWithoutExamsInput = {
    where: QuestionWhereUniqueInput
    create: XOR<QuestionCreateWithoutExamsInput, QuestionUncheckedCreateWithoutExamsInput>
  }

  export type ExamUpsertWithoutQuestionsInput = {
    update: XOR<ExamUpdateWithoutQuestionsInput, ExamUncheckedUpdateWithoutQuestionsInput>
    create: XOR<ExamCreateWithoutQuestionsInput, ExamUncheckedCreateWithoutQuestionsInput>
    where?: ExamWhereInput
  }

  export type ExamUpdateToOneWithWhereWithoutQuestionsInput = {
    where?: ExamWhereInput
    data: XOR<ExamUpdateWithoutQuestionsInput, ExamUncheckedUpdateWithoutQuestionsInput>
  }

  export type ExamUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutExamNestedInput
    lecturer?: UserUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamUncheckedUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUncheckedUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutExamNestedInput
  }

  export type QuestionUpsertWithoutExamsInput = {
    update: XOR<QuestionUpdateWithoutExamsInput, QuestionUncheckedUpdateWithoutExamsInput>
    create: XOR<QuestionCreateWithoutExamsInput, QuestionUncheckedCreateWithoutExamsInput>
    where?: QuestionWhereInput
  }

  export type QuestionUpdateToOneWithWhereWithoutExamsInput = {
    where?: QuestionWhereInput
    data: XOR<QuestionUpdateWithoutExamsInput, QuestionUncheckedUpdateWithoutExamsInput>
  }

  export type QuestionUpdateWithoutExamsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUpdateManyWithoutQuestionNestedInput
    lecturer?: UserUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type QuestionUncheckedUpdateWithoutExamsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type SubmissionCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
    exam: ExamCreateNestedOneWithoutSubmissionsInput
    student: UserCreateNestedOneWithoutSubmissionsInput
  }

  export type SubmissionUncheckedCreateWithoutQuestionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    student_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
  }

  export type SubmissionCreateOrConnectWithoutQuestionsInput = {
    where: SubmissionWhereUniqueInput
    create: XOR<SubmissionCreateWithoutQuestionsInput, SubmissionUncheckedCreateWithoutQuestionsInput>
  }

  export type QuestionCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    exams?: ExamQuestionsCreateNestedManyWithoutQuestionInput
    lecturer: UserCreateNestedOneWithoutQuestionsInput
  }

  export type QuestionUncheckedCreateWithoutSubmissionsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
    exams?: ExamQuestionsUncheckedCreateNestedManyWithoutQuestionInput
  }

  export type QuestionCreateOrConnectWithoutSubmissionsInput = {
    where: QuestionWhereUniqueInput
    create: XOR<QuestionCreateWithoutSubmissionsInput, QuestionUncheckedCreateWithoutSubmissionsInput>
  }

  export type SubmissionUpsertWithoutQuestionsInput = {
    update: XOR<SubmissionUpdateWithoutQuestionsInput, SubmissionUncheckedUpdateWithoutQuestionsInput>
    create: XOR<SubmissionCreateWithoutQuestionsInput, SubmissionUncheckedCreateWithoutQuestionsInput>
    where?: SubmissionWhereInput
  }

  export type SubmissionUpdateToOneWithWhereWithoutQuestionsInput = {
    where?: SubmissionWhereInput
    data: XOR<SubmissionUpdateWithoutQuestionsInput, SubmissionUncheckedUpdateWithoutQuestionsInput>
  }

  export type SubmissionUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    exam?: ExamUpdateOneRequiredWithoutSubmissionsNestedInput
    student?: UserUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateWithoutQuestionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    student_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
  }

  export type QuestionUpsertWithoutSubmissionsInput = {
    update: XOR<QuestionUpdateWithoutSubmissionsInput, QuestionUncheckedUpdateWithoutSubmissionsInput>
    create: XOR<QuestionCreateWithoutSubmissionsInput, QuestionUncheckedCreateWithoutSubmissionsInput>
    where?: QuestionWhereInput
  }

  export type QuestionUpdateToOneWithWhereWithoutSubmissionsInput = {
    where?: QuestionWhereInput
    data: XOR<QuestionUpdateWithoutSubmissionsInput, QuestionUncheckedUpdateWithoutSubmissionsInput>
  }

  export type QuestionUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    exams?: ExamQuestionsUpdateManyWithoutQuestionNestedInput
    lecturer?: UserUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type QuestionUncheckedUpdateWithoutSubmissionsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    exams?: ExamQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type ExamCreateWithoutRegistrationsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsCreateNestedManyWithoutExamInput
    lecturer: UserCreateNestedOneWithoutExamsInput
  }

  export type ExamUncheckedCreateWithoutRegistrationsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    lecturer_id: string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
    submissions?: SubmissionUncheckedCreateNestedManyWithoutExamInput
    questions?: ExamQuestionsUncheckedCreateNestedManyWithoutExamInput
  }

  export type ExamCreateOrConnectWithoutRegistrationsInput = {
    where: ExamWhereUniqueInput
    create: XOR<ExamCreateWithoutRegistrationsInput, ExamUncheckedCreateWithoutRegistrationsInput>
  }

  export type UserCreateWithoutRegistrationsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamCreateNestedManyWithoutLecturerInput
    questions?: QuestionCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionCreateNestedManyWithoutStudentInput
  }

  export type UserUncheckedCreateWithoutRegistrationsInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    full_name: string
    email: string
    password: string
    avatar_url?: string | null
    role?: $Enums.UserRole
    auth_provider?: string
    provider_id?: string | null
    school?: string | null
    phone?: string | null
    address?: string | null
    exams?: ExamUncheckedCreateNestedManyWithoutLecturerInput
    questions?: QuestionUncheckedCreateNestedManyWithoutLecturerInput
    submissions?: SubmissionUncheckedCreateNestedManyWithoutStudentInput
  }

  export type UserCreateOrConnectWithoutRegistrationsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutRegistrationsInput, UserUncheckedCreateWithoutRegistrationsInput>
  }

  export type ExamUpsertWithoutRegistrationsInput = {
    update: XOR<ExamUpdateWithoutRegistrationsInput, ExamUncheckedUpdateWithoutRegistrationsInput>
    create: XOR<ExamCreateWithoutRegistrationsInput, ExamUncheckedCreateWithoutRegistrationsInput>
    where?: ExamWhereInput
  }

  export type ExamUpdateToOneWithWhereWithoutRegistrationsInput = {
    where?: ExamWhereInput
    data: XOR<ExamUpdateWithoutRegistrationsInput, ExamUncheckedUpdateWithoutRegistrationsInput>
  }

  export type ExamUpdateWithoutRegistrationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUpdateManyWithoutExamNestedInput
    lecturer?: UserUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamUncheckedUpdateWithoutRegistrationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    lecturer_id?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUncheckedUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUncheckedUpdateManyWithoutExamNestedInput
  }

  export type UserUpsertWithoutRegistrationsInput = {
    update: XOR<UserUpdateWithoutRegistrationsInput, UserUncheckedUpdateWithoutRegistrationsInput>
    create: XOR<UserCreateWithoutRegistrationsInput, UserUncheckedCreateWithoutRegistrationsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutRegistrationsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutRegistrationsInput, UserUncheckedUpdateWithoutRegistrationsInput>
  }

  export type UserUpdateWithoutRegistrationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUpdateManyWithoutStudentNestedInput
  }

  export type UserUncheckedUpdateWithoutRegistrationsInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    full_name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    auth_provider?: StringFieldUpdateOperationsInput | string
    provider_id?: NullableStringFieldUpdateOperationsInput | string | null
    school?: NullableStringFieldUpdateOperationsInput | string | null
    phone?: NullableStringFieldUpdateOperationsInput | string | null
    address?: NullableStringFieldUpdateOperationsInput | string | null
    exams?: ExamUncheckedUpdateManyWithoutLecturerNestedInput
    questions?: QuestionUncheckedUpdateManyWithoutLecturerNestedInput
    submissions?: SubmissionUncheckedUpdateManyWithoutStudentNestedInput
  }

  export type ExamCreateManyLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    topic: string
    title: string
    exam_start_time: Date | string
    exam_end_time: Date | string
    duration: number
    practice?: boolean
    mode?: $Enums.SelectionMode
    sample_size?: number | null
    distribution?: string | null
    is_public?: boolean
    status?: $Enums.ExamStatus
  }

  export type QuestionCreateManyLecturerInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_text: string
    topic: string
    options?: string | null
    correct_answer?: string | null
    image_url?: string | null
    question_type: $Enums.QuestionType
    question_format: $Enums.QuestionFormat
  }

  export type SubmissionCreateManyStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
  }

  export type ExamRegistrationCreateManyStudentInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
    status?: $Enums.RegistrationStatus
  }

  export type ExamUpdateWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUpdateManyWithoutExamNestedInput
  }

  export type ExamUncheckedUpdateWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
    submissions?: SubmissionUncheckedUpdateManyWithoutExamNestedInput
    questions?: ExamQuestionsUncheckedUpdateManyWithoutExamNestedInput
    registrations?: ExamRegistrationUncheckedUpdateManyWithoutExamNestedInput
  }

  export type ExamUncheckedUpdateManyWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    topic?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    exam_start_time?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_end_time?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: IntFieldUpdateOperationsInput | number
    practice?: BoolFieldUpdateOperationsInput | boolean
    mode?: EnumSelectionModeFieldUpdateOperationsInput | $Enums.SelectionMode
    sample_size?: NullableIntFieldUpdateOperationsInput | number | null
    distribution?: NullableStringFieldUpdateOperationsInput | string | null
    is_public?: BoolFieldUpdateOperationsInput | boolean
    status?: EnumExamStatusFieldUpdateOperationsInput | $Enums.ExamStatus
  }

  export type QuestionUpdateWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUpdateManyWithoutQuestionNestedInput
    exams?: ExamQuestionsUpdateManyWithoutQuestionNestedInput
  }

  export type QuestionUncheckedUpdateWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
    submissions?: SubmissionQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
    exams?: ExamQuestionsUncheckedUpdateManyWithoutQuestionNestedInput
  }

  export type QuestionUncheckedUpdateManyWithoutLecturerInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_text?: StringFieldUpdateOperationsInput | string
    topic?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    correct_answer?: NullableStringFieldUpdateOperationsInput | string | null
    image_url?: NullableStringFieldUpdateOperationsInput | string | null
    question_type?: EnumQuestionTypeFieldUpdateOperationsInput | $Enums.QuestionType
    question_format?: EnumQuestionFormatFieldUpdateOperationsInput | $Enums.QuestionFormat
  }

  export type SubmissionUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUpdateManyWithoutSubmissionNestedInput
    exam?: ExamUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionNestedInput
  }

  export type SubmissionUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
  }

  export type ExamRegistrationUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
    exam?: ExamUpdateOneRequiredWithoutRegistrationsNestedInput
  }

  export type ExamRegistrationUncheckedUpdateWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type ExamRegistrationUncheckedUpdateManyWithoutStudentInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type SubmissionCreateManyExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    student_id: string
    total_score?: Decimal | DecimalJsLike | number | string | null
    rating?: $Enums.Rating | null
    start_time?: Date | string | null
    end_time?: Date | string | null
    status?: $Enums.SubmissionStatus
  }

  export type ExamQuestionsCreateManyExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_id: string
  }

  export type ExamRegistrationCreateManyExamInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    student_id: string
    status?: $Enums.RegistrationStatus
  }

  export type SubmissionUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUpdateManyWithoutSubmissionNestedInput
    student?: UserUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionUncheckedUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    student_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
    questions?: SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionNestedInput
  }

  export type SubmissionUncheckedUpdateManyWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    student_id?: StringFieldUpdateOperationsInput | string
    total_score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    rating?: NullableEnumRatingFieldUpdateOperationsInput | $Enums.Rating | null
    start_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    end_time?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    status?: EnumSubmissionStatusFieldUpdateOperationsInput | $Enums.SubmissionStatus
  }

  export type ExamQuestionsUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question?: QuestionUpdateOneRequiredWithoutExamsNestedInput
  }

  export type ExamQuestionsUncheckedUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_id?: StringFieldUpdateOperationsInput | string
  }

  export type ExamQuestionsUncheckedUpdateManyWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_id?: StringFieldUpdateOperationsInput | string
  }

  export type ExamRegistrationUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
    student?: UserUpdateOneRequiredWithoutRegistrationsNestedInput
  }

  export type ExamRegistrationUncheckedUpdateWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    student_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type ExamRegistrationUncheckedUpdateManyWithoutExamInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    student_id?: StringFieldUpdateOperationsInput | string
    status?: EnumRegistrationStatusFieldUpdateOperationsInput | $Enums.RegistrationStatus
  }

  export type SubmissionQuestionsCreateManySubmissionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    question_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type SubmissionQuestionsUpdateWithoutSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
    question?: QuestionUpdateOneRequiredWithoutSubmissionsNestedInput
  }

  export type SubmissionQuestionsUncheckedUpdateWithoutSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type SubmissionQuestionsUncheckedUpdateManyWithoutSubmissionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    question_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type SubmissionQuestionsCreateManyQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    submission_id: string
    options?: string | null
    answer?: string | null
    score?: Decimal | DecimalJsLike | number | string | null
    is_correct?: boolean
  }

  export type ExamQuestionsCreateManyQuestionInput = {
    id?: string
    created_at?: Date | string
    updated_at?: Date | string
    exam_id: string
  }

  export type SubmissionQuestionsUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
    submission?: SubmissionUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type SubmissionQuestionsUncheckedUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    submission_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type SubmissionQuestionsUncheckedUpdateManyWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    submission_id?: StringFieldUpdateOperationsInput | string
    options?: NullableStringFieldUpdateOperationsInput | string | null
    answer?: NullableStringFieldUpdateOperationsInput | string | null
    score?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    is_correct?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ExamQuestionsUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam?: ExamUpdateOneRequiredWithoutQuestionsNestedInput
  }

  export type ExamQuestionsUncheckedUpdateWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
  }

  export type ExamQuestionsUncheckedUpdateManyWithoutQuestionInput = {
    id?: StringFieldUpdateOperationsInput | string
    created_at?: DateTimeFieldUpdateOperationsInput | Date | string
    updated_at?: DateTimeFieldUpdateOperationsInput | Date | string
    exam_id?: StringFieldUpdateOperationsInput | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}