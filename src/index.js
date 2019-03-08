
import Renderer from '@nikuz/images-core';
import './styles.css';

document.addEventListener('DOMContentLoaded', () => {
    const searchParams = window.location.search.replace('?', '');
    const paramsNumber = [
        'width',
        'height',
        'frameQuality',
    ];
    const paramsBoolean = [
        'animate',
    ];
    const params = {};

    searchParams.split('&').forEach((item) => {
        const param = item.split('=');
        if (param[0] && param[1]) {
            let value = decodeURIComponent(param[1]);
            if (paramsNumber.includes(param[0])) {
                value = Number(value);
            }
            if (paramsBoolean.includes(param[0])) {
                value = value === 'true';
            }
            params[param[0]] = value;
        }
    });
    console.log(params); // eslint-disable-line

    const image = new Renderer({
        ...params,
        container: 'body',
    });
    image.render();

    const buttonRefresh = document.createElement('input');
    buttonRefresh.type = 'button';
    buttonRefresh.value = 'Refresh';
    buttonRefresh.className = 'refresh-button';
    buttonRefresh.onclick = () => {
        image.rerender();
    };
    document.body.appendChild(buttonRefresh);

    const buttonStop = document.createElement('input');
    buttonStop.type = 'button';
    buttonStop.value = 'Stop';
    buttonStop.className = 'refresh-button';
    buttonStop.onclick = () => {
        image.stop();
    };
    document.body.appendChild(buttonStop);
});
