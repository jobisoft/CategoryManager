/* jshint curly: false */
var CSVParser = (function(){
    "use strict";
    function captureFields(fields) {
        /* jshint -W040 */
        if (this.options.ignoreEmpty === false || fields.some(function(field){ return field.length !== 0; })) {
            this.rows.push(fields);
        }
        /* jshint +W040 */
    }

    function Parser(data, options){
        var defaultOptions = { "fieldSeparator": ",", "strict": true, "ignoreEmpty": true};
        if (options === undefined) options = {};
        this.options = {};
        Object.keys(defaultOptions).forEach(function(key) {
            this.options[key] = options[key] === undefined ? defaultOptions[key] : options[key];
        }, this);
        this.rows = [];
        this.data = data;
    }
    Parser.prototype.toString = function toString() { return "[object CSVParser]"; };
    Parser.prototype.numberOfRows = function numberOfRows() { return this.rows.length; };
    Parser.prototype.parse = function parse(){
        // Regular expression for parsing CSV from [Kirtan](http://stackoverflow.com/users/83664/kirtan) on Stack Overflow
        // http://stackoverflow.com/a/1293163/34386
        var regexString = (
            // Delimiters.
            "(\\" + this.options.fieldSeparator + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + this.options.fieldSeparator + "\\r\\n]*))");
            var objPattern = new RegExp(regexString, "gi");
            var doubleQuotePattern = new RegExp( "\"\"", "g" );

        var fields = [];
        var arrMatches = null;
        var strMatchedDelimiter, strMatchedValue;
        /* jshint -W084 */
        while (arrMatches = objPattern.exec( this.data )){
        /* jshint +W084 */
            strMatchedDelimiter = arrMatches[ 1 ];
            if (strMatchedDelimiter.length && (strMatchedDelimiter != this.options.fieldSeparator)){
                captureFields.apply(this, [fields]);
                fields = [];
            }

            if (arrMatches[ 2 ]){
                strMatchedValue = arrMatches[ 2 ].replace(doubleQuotePattern, "\"");
            } else {
                strMatchedValue = arrMatches[ 3 ];
            }
            fields.push( strMatchedValue );
        }
        captureFields.apply(this, [fields]);
        if (this.options.strict === true && !this.rows.every(function(row){ return (row.length === this.length); }, this.rows[0])) {
            throw new Error("Invalid CSV data. Strict mode requires all rows to have the same number of fields. You can override this by passing `strict: false` in the CSVParser options");
        }
    };
    return Parser;
})();