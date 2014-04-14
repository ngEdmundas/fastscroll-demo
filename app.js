(function (sandbox) {
    'use strict';

    sandbox.angular.module('app', [
        'fastscroll'
    ]).run(bootstrapDemoData);

    function bootstrapDemoData($rootScope, $filter) {
        var users = list(20000).map(createDemoUser);
        $rootScope.visibleUsers = $filter('orderBy')(users, 'name', false);

        $rootScope.updateVisibleUsers = function () {
            $rootScope.visibleUsers = $rootScope.visibleUsers = $filter('filter')(users, $rootScope.userFilter);
            $rootScope.visibleUsers = $filter('orderBy')($rootScope.visibleUsers, 'name', $rootScope.reverse);
        };

    }

    function list(n) {
        var lst = [];
        for (; n; n--) { lst.push(n); }
        return lst.reverse();
    }

    function createDemoUser(i) {
        return {
            name: 'user ' + i,
            street: 'some street ' + i,
            town: (i % 2) ? 'my town' : 'your town'
        };
    }

}(this));
