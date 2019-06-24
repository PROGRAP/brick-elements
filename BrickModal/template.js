import content from './template.html';
import styles from './styles';

const template = document.createElement('template');

template.innerHTML = `
    <style>${styles}</style>

    ${content}
`;

export default template;
