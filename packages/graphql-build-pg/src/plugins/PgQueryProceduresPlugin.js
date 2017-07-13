const makeProcField = require("./makeProcField");

module.exports = function PgQueryProceduresPlugin(builder) {
  builder.hook(
    "GraphQLObjectType:fields",
    (fields, build, { scope: { isRootQuery }, buildFieldWithHooks }) => {
      if (!isRootQuery) {
        return fields;
      }
      const {
        extend,
        pgInflection: inflection,
        pgIntrospectionResultsByKind: introspectionResultsByKind,
      } = build;
      return extend(
        fields,
        introspectionResultsByKind.procedure
          .filter(proc => proc.isStable)
          .reduce((memo, proc) => {
            /*
            proc =
              { kind: 'procedure',
                name: 'integration_webhook_secret',
                description: null,
                namespaceId: '6484381',
                isStrict: false,
                returnsSet: false,
                isStable: true,
                returnTypeId: '2950',
                argTypeIds: [ '6484569' ],
                argNames: [ 'integration' ],
                argDefaultsNum: 0 }
            */
            const argTypes = proc.argTypeIds.map(
              typeId => introspectionResultsByKind.typeById[typeId]
            );
            if (argTypes.some(type => type.type === "c" && type.class)) {
              // It selects a table, don't add it at root level (see Computed Columns plugin)
              return memo;
            }

            const fieldName = inflection.functionName(
              proc.name,
              proc.namespace.name
            );
            memo[fieldName] = makeProcField(fieldName, proc, build, {
              buildFieldWithHooks,
            });
            return memo;
          }, {})
      );
    }
  );
};
