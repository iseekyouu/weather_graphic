let graphic = {
    elements: {
        'year-from': document.getElementById('year-from'),
        'year-to': document.getElementById('year-to'),
        'date-start': document.getElementById('date-start'),
        'date-end': document.getElementById('date-end'),
        'temperature-button': document.getElementById('temperature-button'),
        'precipitation-button': document.getElementById('precipitation-button'),
        'clear-button': document.getElementById('clear-button'),
        'r40': document.getElementById('r40'),
        'r10': document.getElementById('r10')
    },

    /// массивы среднемесячной температуры
    temperature: [],
    precipitation: [],

    /// массивы среднегодовой температуры
    avgtemperature: [],
    avgprecipitation: [],

    /// текущий тип данных
    currentState: '',

    /// название текущего массива с среднегодовой
    currentStateArrayName: '',

    /// переменные используемые в canvas
    canvas: {
        d1: '',
        d2: '',

        /// Y шкала
        yArr: [40, 30, 20, 10, 0, -10, -20, -30, -40]
        //yArr: [10, 7.5, 5, 2.5, 0, -2.5, -5, -7.5, -10]
    },

    /// хаб для keyup'ов
    keyhub: [],

    /// тип данных по умолчанию
    defaultDataType: 'temperature',

    debug: 0,

    /*
    * первоначальная инициализация
    * */
    init: function () {
        this.canvasInit();

        let els = this.elements;
        els['date-start'].addEventListener('change', this.periodChangeHandle.bind(this, els['date-start']));
        els['date-end'].addEventListener('change', this.periodChangeHandle.bind(this, els['date-end']));
        els['year-from'].addEventListener('keyup', this.fastSelectYear.bind(this, els['year-from']));
        els['year-to'].addEventListener('keyup', this.fastSelectYear.bind(this, els['year-to']));
        els['temperature-button'].addEventListener('click', this.getData.bind(this, 'temperature', els['temperature-button']));
        els['precipitation-button'].addEventListener('click', this.getData.bind(this, 'precipitation', els['precipitation-button']));
        els['clear-button'].addEventListener('click', this.clearYearInputs.bind(this));
        els['r40'].addEventListener('change', this.degreeChange.bind(this, els['r40']));
        els['r10'].addEventListener('change', this.degreeChange.bind(this, els['r10']));

    },
    
    /**
    * базовая инициализация графика
    * поле и пунктирные линии с градусами
    * */
    canvasInit: function (){
        var canvas = document.getElementById("graphic");
        var context = canvas.getContext("2d");

        context.strokeStyle = 'grey';
        context.lineWidth = 0.5;
        context.lineCap = 'round';
        let temp = this.canvas.yArr;

        /**
         * внешний цикл - отрисовка градусов,
         * внутренний цикл - отрисовка пунктирной линнии
            *  this.canvas.yArr.length + 1 , +1 из-за того что у нас -40
            *  начинается не с границы, а со сдвигом в шаг
         */
        for (let i = 0; i < temp.length; i++){
            let step = parseInt(canvas.height / (temp.length + 1 ));
            let y = step * i + step;
            context.font = "bold 12px sans-serif";
            context.fillText(temp[i], 0, y);

            for (let j = 0; j < canvas.width; j+=5){
                context.strokeStyle = "#000";
                context.beginPath();
                context.arc(j, y, 1, 0, Math.PI * 2, false);
                context.closePath();
                context.stroke();
            }
        }

        context.stroke();
    },

    /**
     * Функция заполнения периодов по типу данных
     * Запустит Worker для обработки среднемесячного массива в среднегодовой
     * можно обойтись и без workera, но с ним чуть-чуть быстре
     * затем инициализируется заполнение периодов
     * @params dataType {String} название типа данных temperature\precipitation
     * @params element {DOMButton} кнопка выбора типа данных, для проставления класса
     *  */
    getData: function (dataType, element) {
        this.clearActiveCss();
        element.classList.add('active');
        this.currentState = dataType;
        this.currentStateArrayName = `avg${dataType}`;
        this.clearPeriod();
        worker.postMessage( {'cmd': 'create-period', arr: this[dataType], name: dataType });
        
        return true;
    },

    /**
     * очистка активного класса
     * */
    clearActiveCss: function(){
        this.elements['precipitation-button'].classList.remove('active');
        this.elements['temperature-button'].classList.remove('active');
    },

    /**
     *  Функция очистки селектов, всех либо по одному по ID
     *  @params selectID {String} - если пусто очистит оба селекта
     * */
    clearPeriod: function(){
        if (arguments.length == 0) {

            this.elements['date-start'].options.length = 0;
            this.elements['date-end'].options.length = 0;
        }

        if (typeof arguments[0] == 'string') {

            if (this.elements[arguments[0]]) {
                this.elements[arguments[0]].options.length = 0;
            }
        }
    },

    /**
     * Функция записи массива для селектов, с среднегодовыми значениями
     * @params data {Object} {name: , arr:}
     * */
    setAvgArray: function (data) {
        this[this.currentStateArrayName] = data.arr;
        return this;
    },

    /**
     * Создание элеметов селекта
     * дефолтные индексы нужны для того чтобы при изменении типа данных
     * даты не сбрасывались
     * @params select {DOMSelect}
     * @params arr {Array} - массив с данными для селекта
     * @params def1 {Integer} - дефолтный индекс для первой даты
     * @params def2 {Integer} - дефолтный индекс для второй даты
     *
     * */
    createOptions: function(select, arr, def1, def2){
        for (var i = 0; i < arr.length; i++){
            let option = arr[i];
            let opt = document.createElement('OPTION');
            opt.text = option.t;
            opt.value = option.t;
            select.options.add(opt);
        }

        select.selectedIndex = select.id == 'date-start' ? (def1 || 0) : (def2 || i-1);
        return this;
    },

    /**
    * заполнение переменных canvas.d1 и canvas.d2 с выбранными индексами для графика
    * @params select {DOM select}
    * @params index {Integer} индекс выбранного элемента
    * */
    setGraphicIndexes: function(select, index){
        if (!index){
            index = select.selectedIndex;
        }

        select.id == 'date-start' ? this.canvas.d1 = index : this.canvas.d2 = index;

        return this;
    },

    /**
     * очистка полей ввода быстрого переключения года
     * */
    clearYearInputs: function(){
        this.elements['year-from'].value = '';
        this.elements['year-to'].value = '';
        this.periodFilter(this.elements['year-from']);
        this.periodFilter(this.elements['year-to']);

    },

    /**
     * процедура создания периодов из Workera
     * @params select {DOM select}
     * @params data {Object} {name: , arr:}
     */
    createOptionsHandle: function (select, data) {
        this.createOptions(select, data.arr, this.canvas.d1, this.canvas.d2);
        this.setGraphicIndexes(select);
        //this.clearYearInputs();

        return this;
    },

    findIndex: function(select){
        let index = this[this.currentStateArrayName].findIndex(function(item){
            return item.t == select.value;
        });

        return index;
    },

    /**
     * обработчик события onchange у select
     * заполняет переменные индекса для графика
     * запускает отрисовку графика
     * @param select {DOMSelectElement} select с датами
     */
    periodChangeHandle: function(select){
        let index = this.findIndex(select);
        this.setGraphicIndexes(select, index);
        this.draw();
    },

    /**
     * функция отрисовки графика
     * @returns true
     */
    draw: function (){
        let arr = this[this.currentStateArrayName];
        if (this.canvas.d1 > this.canvas.d2) return false;

        let canvas = document.getElementById("graphic");
        let context = canvas.getContext("2d");

        /// очистка canvas и последующая инициализация сетки
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.canvasInit();

        context.beginPath();
        context.strokeStyle = "#000";
        context.font = "bold 8px sans-serif";

        /**
        * xShift - сдвиг с правого края графика, чтобы линия не упиралась в границу графика
        * xStep - шаг с учетом уменьшенного размера из-за сдвига
        * xStepShift - сдвиг шага, чтобы линия начиналась на с левой границы графика
        * */
        let xWidth = canvas.width;
        let xShift = (xWidth * 0.1);
        let xStepShift = xShift/2;
        let xStep = parseFloat(
            (xWidth - xShift - xStepShift) /
            ((this.canvas.d2 - this.canvas.d1) == 0 ? 1 : this.canvas.d2 - this.canvas.d1)
        );

        /**
         * определяем 'у' координату температуры
         * yZero - координаты нуля
         * yStep - шаг между десятками градусов
            *  this.canvas.yArr.length + 1 , +1 из-за того что у нас -40
            *  начинается не с границы, а со сдвигом в шаг
         * oneDegree - размер 1 шага в пикселях
         */
        let yZero = canvas.height / 2;
        let yStep = canvas.height / (this.canvas.yArr.length + 1);
        let oneDegree = yStep / (this.canvas.yArr[0] - this.canvas.yArr[1]);

        let x,y;

        /**
         * в цикле считаем  Х и У точки в графике
         * рисуем в нужном месте точку, прямоугольник с числовым значением средней температуры
         */
        for (let i = 0; i <= (this.canvas.d2 - this.canvas.d1); i++){
            let index = this.canvas.d1 + i;
            let t = arr[index].t;
            let v = arr[index].v;
            y = yZero - (parseFloat(v) * oneDegree);
            x = i * xStep + xStepShift;

            if (this.debug) console.log(t, v);

            if (i == 0){
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
            context.strokeStyle = "lightgreen";
            context.fillStyle = "lightgreen";
            context.fillRect(x, y, 17, 13);

            context.strokeStyle = "#000";
            context.fillStyle = "#000";
            context.fillText(v, x+3, y+8);
            context.arc(x, y, 1, 0, Math.PI * 2, false);
        }
        context.moveTo(x, y);
        context.closePath();
        context.stroke();

        return true;
    },

    /**
     * обработчик быстрого переключения года, инициатива
     */
    fastSelectYear: function(input){
        let self = this;
        self.keyhub.push();

        setTimeout(function(){
            if (!self.currentState) return false;
            
            /// событий keyup может возникнуть не одно, отсекаем лишние
            if (self.keyhub.length > 1){
                self.keyhub.pop();
                return;
            }

            self.periodFilter(input);
        }, 500);
    }
    ,

    /**
     * фильтрация массива в объекте данных по введенной информации
     * создаем период по отфильтрованному массиву
     * если фильтр ничего не отфильтровал(введена плохая информация)
     * то ставим активным первый элемент
     * @params input {DOMInput} Input по которому происходит фильтрация
     */
    periodFilter: function(input){
        let select = input.id == 'year-from' ?
            this.elements['date-start'] : this.elements['date-end'];
        let val = input.value;
        let z = this[this.currentStateArrayName].filter(function(item){
            return item.t.indexOf(val) >-1;
        });

        if (!z.length) z.push(this[this.currentStateArrayName][0]);

        this.clearPeriod(select.id);
        this.createOptions(select, z);
        this.periodChangeHandle(select);
        this.keyhub.length = 0;
    },

    /**
     * изменение У шкалы графика, инициатива
     * шкала типа 4 диапазона выше нуля и 4 ниже нуля
     * @params radio {DOMRadio} радио с значнием максимального градуса по плюсу
     * */
    degreeChange: function(radio){
        let value = +radio.value;

        if (!value) return false;

        let step = value / 4;
        let yArr = [value];

        for (let i = 1; i < 9; i++){
            value = value - step;
            yArr.push(value);
        }

        this.canvas.yArr = yArr;
        this.draw();
    }
};

var worker = new Worker('js/worker.js?'+Math.random());
worker.addEventListener('message', function(e) {
    let methods = {
        
        /**
         * Создание периодов
         * */
        'create-period': function (data) {
            graphic.setAvgArray(data);
            graphic.createOptionsHandle(graphic.elements['date-start'], data);
            graphic.createOptionsHandle(graphic.elements['date-end'], data);
            graphic.draw();
        },
        
        /**
         * Вставка в базу данных
         * */
        'insert-to-database': function (data){
            for (var i = 0; i < data.arr.length; i++){
                Window.db.addRecord(data.name, data.arr[i]);
            }
        },
        
        /**
         * запись массивов с среднемесячной информацией
         * */
        'set-graphic-arr': function(data){
            graphic[data.name] = data.arr;

            /// вставлено сюда для ускорения работы при первом запуске,
            /// как только получили температуру, так сразу инициализируем график
            if (data.name == graphic.defaultDataType) {
                this['default-initilize']();
            }
        },
        
        /**
         * дефолтная инициализация по температуре
         * */
        'default-initilize': function(){
            graphic.getData(graphic.defaultDataType, graphic.elements['temperature-button']);
        }
    };

    if (methods[e.data.cmd]) {
        methods[e.data.cmd](e.data.data);
    }

}, false);

window.onload = function(){
    graphic.init();
};

function clearObjectStore (){
    Window.db.clearObjectStore('temperature');
    Window.db.clearObjectStore('precipitation');

}


