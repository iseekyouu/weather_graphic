self.addEventListener('message', function(e) {
    var data = e.data;
    let methods = {
        'create-period': function(){
            /**
             * группировка массива по годам для селектов дат
             * согласно задания: "Пользователь должен иметь возможность уточнить
                 период отображения архива и указать период с точностью до года."
             */

            /// считаем среднее значение температуры по годам
            let arr = data.arr;
            let prevYear = 0;
            let avgArr = [];
            let resultArr = [];

            for (let i = 0; i < arr.length; i++){
                let year = arr[i].t.split('-')[0];

                if ( (year != prevYear) && (prevYear != 0) ){
                    let v = getAvgByArr(avgArr);
                    resultArr.push({'t': prevYear, 'v': v });
                    avgArr = [];
                }

                avgArr.push(arr[i].v);
                prevYear = year;
            }

            /// для того, чтобы не потерять последний год
            resultArr.push({'t': prevYear, 'v': getAvgByArr(avgArr) });
            self.postMessage({cmd: 'create-period', data: {name: data.name, arr: resultArr}});
        },

        'insert-to-database': function(){
            /**
             * Группировка массива по месяцам, и запись в БД согласно задания:
                * "Запись за отдельный месяц метеорологических измерений должна хранится как
                    отдельный объект/запись в IndexedDB."
             */

            /// считаем среднее значение температуры по месяцам
            let arr = data.arr;
            let prevYear = 0;
            let prevMonth = 0;
            let avgArr = [];
            let resultArr = [];

            for (let i = 0; i < arr.length; i++){
                let dateArr = arr[i].t.split('-');
                let year = dateArr[0];
                let month = dateArr[1];

                if ( (month != prevMonth) && (prevMonth != 0) ){
                    let v = getAvgByArr(avgArr);
                    resultArr.push({'t': prevYear+ '-' +prevMonth, 'v': v });
                    avgArr = [];
                }

                avgArr.push(arr[i].v);
                prevMonth = month;
                prevYear = year;
            }

            // для того чтобы не потерять последний месяц
            resultArr.push({'t': `${prevYear}-${prevMonth}`, 'v': getAvgByArr(avgArr) });

            self.postMessage({cmd: 'set-graphic-arr', data: {name: data.name, arr: resultArr}});
            self.postMessage({cmd: 'insert-to-database', data: {name: data.name, arr: resultArr}});
        },
        
        'set-graphic-arr': function(){
            self.postMessage({cmd: 'set-graphic-arr', data: {name: data.name, arr: data.arr}});
        }
        
    };

    /**
     * Расчет среднего значения по массиву
     * @param arr {Array} массив значений 'v'
     * @returns {float} среднее значение по массиву, с точностью до 1 знака.
     */
    function getAvgByArr(arr){
        if (!arr.length) return false;

        let v =
            parseFloat(
                arr.reduce( (a, b) => { return parseFloat(a) + parseFloat(b) } ) /
                ( arr.length == 0 ? 1 : arr.length)
            ).toFixed(1);
        return v;
    }

    if (methods[data.cmd]) {
        methods[data.cmd]()
    } else {
        self.postMessage('Unknown command: ' + data.msg);
    }

}, false);