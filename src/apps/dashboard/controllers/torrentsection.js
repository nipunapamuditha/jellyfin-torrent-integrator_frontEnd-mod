import globalize from 'lib/globalize';
import loading from 'components/loading/loading';
import 'elements/emby-button/emby-button';
import Dashboard from 'utils/dashboard';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Component } from '../routes/TorrentSection';

export default function (view) {
    // This function gets called when the page is shown
    view.addEventListener('viewshow', function () {
        loading.show();
        
        const mainContent = view.querySelector('.mainContent');
        
        // Render the React component into the mainContent div
        ReactDOM.render(React.createElement(Component), mainContent);
        
        loading.hide();
    });
    
    // Clean up React component when leaving the page
    view.addEventListener('viewhide', function () {
        const mainContent = view.querySelector('.mainContent');
        if (mainContent) {
            ReactDOM.unmountComponentAtNode(mainContent);
        }
    });
}