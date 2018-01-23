'use strict';

angular.module('bahmni.common.displaycontrol.custom')
    .directive('birthCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
        var link = function ($scope) {
            var conceptNames = ["HEIGHT"];
            $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/birthCertificate.html";
            spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
                $scope.observations = response.data;
            }));
        };

        return {
            restrict: 'E',
            template: '<ng-include src="contentUrl"/>',
            link: link
        }
    }]).directive('deathCertificate', ['observationsService', 'appService', 'spinner', function (observationsService, appService, spinner) {
    var link = function ($scope) {
        var conceptNames = ["WEIGHT"];
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/deathCertificate.html";
        spinner.forPromise(observationsService.fetch($scope.patient.uuid, conceptNames, "latest", undefined, $scope.visitUuid, undefined).then(function (response) {
            $scope.observations = response.data;
        }));
    };

    return {
        restrict: 'E',
        link: link,
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('customTreatmentChart', ['appService', 'treatmentConfig', 'TreatmentService', 'spinner', '$q', function (appService, treatmentConfig, treatmentService, spinner, $q) {
    var link = function ($scope) {
        var Constants = Bahmni.Clinical.Constants;
        var days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/customTreatmentChart.html";

        $scope.atLeastOneDrugForDay = function (day) {
            var atLeastOneDrugForDay = false;
            $scope.ipdDrugOrders.getIPDDrugs().forEach(function (drug) {
                if (drug.isActiveOnDate(day.date)) {
                    atLeastOneDrugForDay = true;
                }
            });
            return atLeastOneDrugForDay;
        };

        $scope.getVisitStopDateTime = function () {
            return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
        };

        $scope.getStatusOnDate = function (drug, date) {
            var activeDrugOrders = _.filter(drug.orders, function (order) {
                if ($scope.config.frequenciesToBeHandled.indexOf(order.getFrequency()) !== -1) {
                    return getStatusBasedOnFrequency(order, date);
                } else {
                    return drug.getStatusOnDate(date) === 'active';
                }
            });
            if (activeDrugOrders.length === 0) {
                return 'inactive';
            }
            if (_.every(activeDrugOrders, function (order) {
                    return order.getStatusOnDate(date) === 'stopped';
                })) {
                return 'stopped';
            }
            return 'active';
        };

        var getStatusBasedOnFrequency = function (order, date) {
            var activeBetweenDate = order.isActiveOnDate(date);
            var frequencies = order.getFrequency().split(",").map(function (day) {
                return day.trim();
            });
            var dayNumber = moment(date).day();
            return activeBetweenDate && frequencies.indexOf(days[dayNumber]) !== -1;
        };

        var init = function () {
            var getToDate = function () {
                return $scope.visitSummary.stopDateTime || Bahmni.Common.Util.DateUtil.now();
            };

            var programConfig = appService.getAppDescriptor().getConfigValue("program") || {};

            var startDate = null, endDate = null, getEffectiveOrdersOnly = false;
            if (programConfig.showDetailsWithinDateRange) {
                startDate = $stateParams.dateEnrolled;
                endDate = $stateParams.dateCompleted;
                if (startDate || endDate) {
                    $scope.config.showOtherActive = false;
                }
                getEffectiveOrdersOnly = true;
            }

            return $q.all([treatmentConfig(), treatmentService.getPrescribedAndActiveDrugOrders($scope.config.patientUuid, $scope.config.numberOfVisits,
                $scope.config.showOtherActive, $scope.config.visitUuids || [], startDate, endDate, getEffectiveOrdersOnly)])
                .then(function (results) {
                    var config = results[0];
                    var drugOrderResponse = results[1].data;
                    var createDrugOrderViewModel = function (drugOrder) {
                        return Bahmni.Clinical.DrugOrderViewModel.createFromContract(drugOrder, config);
                    };
                    for (var key in drugOrderResponse) {
                        drugOrderResponse[key] = drugOrderResponse[key].map(createDrugOrderViewModel);
                    }

                    var groupedByVisit = _.groupBy(drugOrderResponse.visitDrugOrders, function (drugOrder) {
                        return drugOrder.visit.startDateTime;
                    });
                    var treatmentSections = [];

                    for (var key in groupedByVisit) {
                        var values = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(groupedByVisit[key]);
                        treatmentSections.push({visitDate: key, drugOrders: values});
                    }
                    if (!_.isEmpty(drugOrderResponse[Constants.otherActiveDrugOrders])) {
                        var mergedOtherActiveDrugOrders = Bahmni.Clinical.DrugOrder.Util.mergeContinuousTreatments(drugOrderResponse[Constants.otherActiveDrugOrders]);
                        treatmentSections.push({
                            visitDate: Constants.otherActiveDrugOrders,
                            drugOrders: mergedOtherActiveDrugOrders
                        });
                    }
                    $scope.treatmentSections = treatmentSections;
                    if ($scope.visitSummary) {
                        $scope.ipdDrugOrders = Bahmni.Clinical.VisitDrugOrder.createFromDrugOrders(drugOrderResponse.visitDrugOrders, $scope.visitSummary.startDateTime, getToDate());
                    }
                });
        };
        spinner.forPromise(init());
    };

    return {
        restrict: 'E',
        link: link,
        scope: {
            config: "=",
            visitSummary: '='
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('patientEncounterLocations', ['$http', 'appService', 'spinner', function ($http, appService, spinner) {
    var link = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/patientLocationEncounters.html";
        $scope.title = $scope.config.title;
        $scope.isEncounterListShown = true;

        var isDashboardBeingPrinted = function () {
            return $scope.$root.isBeingPrinted;
        };

        var emitNoDataPresentEvent = function () {
            return $scope.$emit("no-data-present-event");
        };

        var sortEncounterByEncounterDateTime = function (encounters) {
            return _.sortBy(encounters, "encounterDateTime").reverse();
        };

        var fetchLocationsInfoForEncounters = function (patientProgramUuid) {
            return $http.get('/openmrs/ws/rest/v1/bahmniprogramencounter', {
                params: {
                    patientProgramUuid: patientProgramUuid
                },
                withCredentials: true
            });
        };

        spinner.forPromise(fetchLocationsInfoForEncounters($scope.enrollment).then(function (response) {
            var encounters = response.data;
            $scope.encounterLocationInfo = sortEncounterByEncounterDateTime(encounters);
            var number = isDashboardBeingPrinted() ? $scope.encounterLocationInfo.length : 3;
            var firstThreeEncounters = _.take($scope.encounterLocationInfo, number);
            _.each(firstThreeEncounters, function (encounter) {
                encounter.isOpen = true
            });
            if ($scope.encounterLocationInfo.length <= 0) {
                emitNoDataPresentEvent();
                $scope.isEncounterListShown = false;
            }
        }));
    };

    return {
        restrict: 'E',
        link: link,
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('surgicalHistory', ['$http', 'appService', 'spinner', function ($http, appService, spinner) {
    var link = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/surgicalHistory.html";
        $scope.title = $scope.config.title;

        var emitNoDataPresentEvent = function () {
            return $scope.$emit("no-data-present-event");
        };

        var getResponseFromQuery = function () {
            var params = {
                q: "bahmni.sqlGet.otSurgicalHistory",
                v: "full",
                patientUuid: $scope.patient.uuid
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };

        spinner.forPromise(getResponseFromQuery().then(function (response) {
            $scope.surgicalHistory = response.data;
            if ($scope.surgicalHistory.length <= 0) {
                emitNoDataPresentEvent();
            } else {
                $scope.headings = _.keys($scope.surgicalHistory[0]);
            }
        }));
    };

    return {
        restrict: 'E',
        link: link,
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('patientMovementHistory', ['$http', '$stateParams', 'appService', 'spinner', function ($http, $stateParams, appService, spinner) {
    var controller = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/patientMovementHistory.html";
        $scope.title = $scope.config.title;

        var emitNoDataPresentEvent = function () {
            return $scope.$emit("no-data-present-event");
        };

        var getResponseFromQuery = function () {
            var params = {
                patientUuid: $scope.patient.uuid,
                visitUuid: $stateParams.visitUuid,
                q: "bahmni.sqlGet.ipdPatientMovementHistory",
                v: "full"
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };

        spinner.forPromise(getResponseFromQuery().then(function (response) {
            $scope.patientMovementHistory = response.data;
            if ($scope.patientMovementHistory.length <= 0) {
                emitNoDataPresentEvent();
            } else {
                $scope.headings = _.keys($scope.patientMovementHistory[0]);
            }
        }));
    };

    return {
        restrict: 'E',
        controller: controller,
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('patientAppointmentsDashboard', ['$http', '$q', '$window', 'appService', function ($http, $q, $window, appService) {
    var link = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/patientAppointmentsDashboard.html";
        var getUpcomingAppointments = function () {
            var params = {
                q: "bahmni.sqlGet.upComingAppointments",
                v: "full",
                patientUuid: $scope.patient.uuid
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };
        var getPastAppointments = function () {
            var params = {
                q: "bahmni.sqlGet.pastAppointments",
                v: "full",
                patientUuid: $scope.patient.uuid
            };
            return $http.get('/openmrs/ws/rest/v1/bahmnicore/sql', {
                method: "GET",
                params: params,
                withCredentials: true
            });
        };
        $q.all([getUpcomingAppointments(), getPastAppointments()]).then(function (response) {
            $scope.upcomingAppointments = response[0].data;
            $scope.upcomingAppointmentsHeadings = _.keys($scope.upcomingAppointments[0]);
            $scope.pastAppointments = response[1].data;
            $scope.pastAppointmentsHeadings = _.keys($scope.pastAppointments[0]);
        });

        $scope.goToListView = function () {
            $window.open('/bahmni/appointments/#/home/manage/appointments/list');
        };
    };
    return {
        restrict: 'E',
        link: link,
        scope: {
            patient: "=",
            section: "="
        },
        template: '<ng-include src="contentUrl"/>'
    };
}]).directive('microbiologyLabResults', ['$http', '$q', '$window', 'appService', 'bacteriologyTabInitialization', 'bacteriologyResultsService', function ($http, $q, $window, appService, bacteriologyTabInitialization, bacteriologyResultsService) {
    var link = function ($scope) {
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/bacteriologyResultsControl.html";
        var params = {
            patientUuid: $scope.patient.uuid,
            patientProgramUuid: $scope.enrollment
        };

        var expandAllSpecimens = function () {
            _.each($scope.specimens, function (specimen) {
                specimen.isOpen = true;
            });
        };

        var expandAllSpecimensIfDashboardPrinting = function () {
            if ($scope.$root.isBeingPrinted) {
                expandAllSpecimens();
            }
        };

        bacteriologyTabInitialization().then(function (data) {
            $scope.bacteriologyTabData = data;
            bacteriologyResultsService.getBacteriologyResults(params).then(function (response) {
                handleResponse(response);
                expandAllSpecimensIfDashboardPrinting();
            });
        });

        $scope.getDisplayName = function (specimen) {
            var type = specimen.type;
            var displayName = type.shortName ? type.shortName : type.name;
            if (displayName === Bahmni.Clinical.Constants.bacteriologyConstants.otherSampleType) {
                displayName = specimen.typeFreeText;
            }
            return displayName;
        };

        $scope.getFinalIdentificationSections = function (specimen) {
            return _.filter(specimen.sampleResult.groupMembers, function (groupMember) {
                return groupMember.concept.name === 'Bacteriology, Final Identification';
            });
        };

        $scope.isAntibiogram = function (observation) {
            var antiBiograms = {
                "Resistant": "R",
                "Intermediate": "I",
                "Susceptible": "S",
                "Positive": "+ve",
                "Negative": "-ve",
                "Sharp": "Sharp",
                "Fuzzy": "Fuzzy"
            };
            return _.indexOf(Object.keys(antiBiograms), observation.value.name) >= 0 && antiBiograms[observation.value.name];
        };

        $scope.getColor = function (observation) {
            var colors = {
                "Resistant": "#FF0000",
                "Intermediate": "#000000",
                "Susceptible": "#008000",
                "Positive": "#008000",
                "Negative": "#FF0000"
            };
            return colors[observation.value.name];
        };

        $scope.isAlert = function (observation) {
            var alerts = ['Microbiology, Are there any alerts?', 'Microbiology, Alerts Set'];
            return alerts.indexOf(observation.concept.name) >= 0;
        };

        var handleResponse = function (response) {
            $scope.observations = response.data.results;
            if ($scope.observations && $scope.observations.length > 0) {
                $scope.specimens = [];
                var sampleSource = _.find($scope.bacteriologyTabData.setMembers, function (member) {
                    return member.name.name === Bahmni.Clinical.Constants.bacteriologyConstants.specimenSampleSourceConceptName;
                });
                $scope.allSamples = sampleSource !== undefined && _.map(sampleSource.answers, function (answer) {
                    return new Bahmni.Common.Domain.ConceptMapper().map(answer);
                });
                var specimenMapper = new Bahmni.Clinical.SpecimenMapper();
                var conceptsConfig = appService.getAppDescriptor().getConfigValue("conceptSetUI") || {};
                var dontSortByObsDateTime = true;
                _.forEach($scope.observations, function (observation) {
                    $scope.specimens.push(specimenMapper.mapObservationToSpecimen(observation, $scope.allSamples, conceptsConfig, dontSortByObsDateTime));
                });

                $scope.specimens = _.filter($scope.specimens, function (specimen) {
                    return _.isEmpty(specimen.sampleResult) || !_.find(specimen.sampleResult.groupMembers, function (member) {
                        return member.value && member.value.name === 'Answer, Intermediate Identification';
                    });
                });
            } else {
                $scope.specimens = [];
            }

            $scope.isDataPresent = function () {
                if (!$scope.specimens || !$scope.specimens.length) {
                    return $scope.$emit("no-data-present-event") && false;
                }
                return true;
            };
        };
    };
    return {
        restrict: 'E',
        link: link,
        scope: {
            patient: "=",
            section: "="
        },
        template: '<ng-include src="contentUrl"/>'
    };
}]).service("physioSummaryService", ["$http", function ($http) {

    const getContainer = function (baseHolder, conceptName) {
        var holder = baseHolder[conceptName] || {};
        holder.left = holder.left || [];
        holder.right = holder.right || [];
        holder.display = conceptName;
        baseHolder[conceptName] = holder;
        return baseHolder;
    };

    const splitByColon = function (conceptNameToDisplay) {
        return _.trim(_.last(conceptNameToDisplay.split(":")));
    };

    const isEqualName = function (conceptNameToDisplay, conceptName) {
        return getNameInLowerCase(splitByColon(conceptNameToDisplay)) === getNameInLowerCase(conceptName);
    };

    const getNameInLowerCase = function (name) {
        return _.trim(name.toLowerCase());
    };

    const findMember = function (member, conceptName) {
        return _.find(member.groupMembers, function (member) {
            return isEqualName(member.conceptNameToDisplay, conceptName);
        });
    };

    const findByConceptNameToDisplay = function (members, conceptName) {
        return _.find(members, ['conceptNameToDisplay', conceptName]) || {};
    };
    this.findByConceptNameToDisplay = findByConceptNameToDisplay;

    const getValue = function (members, conceptName) {
        var member = findMember(members, conceptName);
        return (member && member.value) || "";
    };

    const insertValue = function (conceptName, baseHolder, values, sortWeight) {
        baseHolder = getContainer(baseHolder || {}, conceptName);
        baseHolder[conceptName].sort = sortWeight;

        _.forEach(values, function (valueMember) {
            baseHolder[conceptName][getNameInLowerCase(valueMember.key)].push(valueMember.value);
        });

        return baseHolder;
    };

    const getValues = function (groupMembers, conceptNames, holders) {
        holders = holders || {};

        _.forEach(conceptNames, function (concept) {
            var values = [
                {
                    key: groupMembers[0].conceptNameToDisplay,
                    value: getValue(groupMembers[0], concept.name)
                },
                {
                    key: groupMembers[1].conceptNameToDisplay,
                    value: getValue(groupMembers[1], concept.name)
                }
            ];
            insertValue(concept.name, holders, values, concept.sort);
        });
        return holders;
    };

    const getFilterRecords = function (records, requiredConceptNames) {
        return _.map(records, function (record) {
            return _.filter(record.groupMembers, function (groupMember) {
                return _.includes(requiredConceptNames, groupMember.conceptNameToDisplay);
            });
        });
    };

    const mapCrucialInfoToObs = function (crucialConcepts, record, mappedData) {
        _.forEach(crucialConcepts, function (conceptName, index) {
            var value = findByConceptNameToDisplay(record, conceptName).valueAsString;
            mappedData = insertValue(conceptName, mappedData, [{key: "left", value: value},
                {key: "right", value: value}], index);
        });
        return mappedData;
    };

    const flatMultiLevelObs = function (records, concepts) {
        return _.flatMap(records, function (record, key) {
            return _.includes(concepts, record.display) ? record :
                _.concat([{left: "left", right: "right", display: key, isSubHeader: true}], _.values(record));
        });
    };

    const mapLeafConcepts = function (leafConcepts, holder, groupMember) {
        if (!_.isEmpty(groupMember)) {
            getValues(groupMember.groupMembers, leafConcepts, holder);
        } else {
            _.forEach(leafConcepts, function (concept) {
                getContainer(holder, concept.name)
            })
        }
        return holder;
    };

    const mapSubGroupMembers = function (concepts, baseHolder, members) {
        _.forEach(concepts, function (conceptMember) {
            var conceptNameToDisplay = getNameInLowerCase(conceptMember.name);
            baseHolder[conceptNameToDisplay] = mapLeafConcepts(conceptMember.leafConcepts, baseHolder[conceptNameToDisplay] || {},
                findByConceptNameToDisplay(members, conceptMember.name));
        });
        return baseHolder;
    };

    const putMemberAt = function (holder, position, data) {
        holder.splice(position, 0, data);
        return holder;
    };

    const getFirstMember = function (records) {
        return _.first(_.values(records));
    };

    const insertAdditionalInfo = function (title, data, mappedData) {
        if (!_.isEmpty(title.crucialConcepts)) {
            _.forEach(title.additionalConcepts, function (concept) {
                putMemberAt(data, concept.position, concept.member);
            });

            var member = getFirstMember(data);
            return _.assign(mappedData, {
                data: data,
                leftHeaders: new Array(member.left.length),
                rightHeaders: new Array(member.right.length)
            });
        }
        else {
            return data;
        }
    };

    this.mapObservations = function (records, concepts, crucialConcepts) {
        var mappedData = {};
        _.forEach(records, function (record) {
            var filteredRecords = _.filter(record, function (each) {
                return !(_.isEmpty(each.groupMembers) || _.includes(crucialConcepts, each.conceptNameToDisplay))
            });

            _.forEach(filteredRecords, function (eachRecord) {
                getValues(eachRecord.groupMembers, concepts, mappedData);
                mapCrucialInfoToObs(crucialConcepts, record, mappedData)
            });
        });
        return _.values(mappedData);
    };

    this.mapMultilevelObservations = function (records, concepts, crucialConcepts, parentConcept) {
        var mappedData = {};
        _.forEach(records, function (record) {
            var motor = findByConceptNameToDisplay(findByConceptNameToDisplay(record, parentConcept).groupMembers, "Motor");
            if (!_.isEmpty(motor)) {
                mappedData = mapSubGroupMembers(concepts, mapCrucialInfoToObs(crucialConcepts, record, mappedData), motor.groupMembers);
            }
        });

        return flatMultiLevelObs(mappedData, crucialConcepts);
    };

    const assign = function (record, holder) {
        holder = holder || {};
        if (record) {
            holder[_.trim(_.first(_.split(record.conceptNameToDisplay, ":")))] = record.valueAsString;
        }
        return holder;
    };

    this.map = function (tableTitles, responseData) {
        return _.map(tableTitles, function (title) {
            var filterRecords = getFilterRecords(responseData, title.crucialConcepts.concat(title.name));
            var data = title.mapper(filterRecords, title.requiredGroupConceptNames, title.crucialConcepts, title.name);
            var mappedData = {title: title.name, data: data};
            return _.isEmpty(data) ? mappedData : insertAdditionalInfo(title, data, mappedData);
        });
    };

    this.fetchObservationsData = function (conceptNames, enrollment, numberOfVisits, scope) {
        var params = {
            concept: conceptNames,
            patientProgramUuid: enrollment,
            scope: scope,
            numberOfVisits: numberOfVisits
        };
        return $http.get('/openmrs/ws/rest/v1/bahmnicore/observations', {
            params: params,
            withCredentials: true
        });
    };

    this.isStumpCircumference = function (record) {
        return _.isEqual(record.title, "Stump circumference");
    };

    this.mapStumpCircumference = function (records) {
        // TODO: Need Refactoring
        var data = {};
        _.forEach(records, function (record) {
            var typeOfAmputation = findByConceptNameToDisplay(record.groupMembers, "Type of amputation");
            if (!_.isEmpty(typeOfAmputation)) {
                var container = data[typeOfAmputation.valueAsString] || {};
                container.type = typeOfAmputation.valueAsString;
                container.values = container.values || [];
                _.forEach(record.groupMembers, function (groupMember) {
                    if (isEqualName(groupMember.conceptNameToDisplay, "Stump circumference")) {
                        var member = _.first(groupMember.groupMembers);
                        var member2 = _.last(groupMember.groupMembers);
                        var holder = assign(member2, assign(member, {}));

                        !_.isEmpty(holder) && container.values.push(holder);
                    }
                });
                if (!_.isEmpty(container.values)) {
                    data[typeOfAmputation.valueAsString] = container;
                }
            }
        });
        return data;
    }

}]).directive('lowerLimbPhysioSummary', ['appService', 'physioSummaryService', 'spinner', '$q', function (appService, physioSummaryService, spinner, $q) {
    const requiredGroupConceptNames = [
        {name: "Hip Flex.", sort: 4},
        {name: "Hip Ext.", sort: 5},
        {name: "Int. Rotation", sort: 6},
        {name: "Ext. Rotation", sort: 7},
        {name: "Abduction", sort: 8},
        {name: "Adduction", sort: 9},
        {name: "Knee Flex.", sort: 10},
        {name: "Knee Ext.", sort: 11},
        {name: "Ankle Dorsiflex.", sort: 12},
        {name: "Ankle Planterflex", sort: 13},
        {name: "Ankle Inversion", sort: 14},
        {name: "Ankle Eversion", sort: 15}
    ];

    const multiLevelGroupConcepts = [
        {name: "Superior gluteal", leafConcepts: [{name: "Gluteus medius"}]},
        {name: "Inferior gluteal", leafConcepts: [{name: "Gluteus maxi."}]},
        {name: "Femoral", leafConcepts: [{name: "Quadriceps"}, {name: "Illiopsoas"}]},
        {name: "Obturator", leafConcepts: [{name: "Adductors"}]},
        {
            name: "Peronial",
            leafConcepts: [{name: "Tibialis anterior"}, {name: "Peron. long. brev"}, {name: "Ext. digitorum"}, {name: "Ext. hallucis"}]
        },
        {
            name: "Tibial nerve",
            leafConcepts: [{name: "Gastrocnemius"}, {name: "Tibialis post."}, {name: "Flex. digi. long"}, {name: "Flex. hall. long"}]
        }
    ];

    const subConcept = [{
        position: 2, member: {
            sort: 3,
            left: "Left",
            right: "Right",
            display: "Movement",
            isSubHeader: true
        }
    }];
    const conceptNames = [
        "Lower Limb Physiotherapy Assessment"
    ];

    const tableTitles = [
        {
            name: 'R.O.M Test for Lower Limbs',
            mapper: physioSummaryService.mapObservations,
            requiredGroupConceptNames: requiredGroupConceptNames,
            additionalConcepts: subConcept,
            crucialConcepts: ['Date recorded', 'Type of assessment']
        },
        {
            name: 'Muscle Test for Lower Limbs',
            mapper: physioSummaryService.mapObservations,
            requiredGroupConceptNames: requiredGroupConceptNames,
            additionalConcepts: subConcept,
            crucialConcepts: ['Date recorded', 'Type of assessment']
        },
        {
            name: 'Neurological exam of lower limb',
            mapper: physioSummaryService.mapMultilevelObservations,
            requiredGroupConceptNames: multiLevelGroupConcepts,
            additionalConcepts: [],
            crucialConcepts: ['Date recorded', 'Type of assessment']
        }
    ];

    var link = function ($scope, element) {
        var defer = $q.defer();
        spinner.forPromise(defer.promise, element);
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/lowerLimbPhysioSummary.html";

        var p1 = physioSummaryService.fetchObservationsData(conceptNames, $scope.enrollment, 5).then(function (response) {
            $scope.groupRecords = physioSummaryService.map(tableTitles, response.data);
        });

        var p2 = physioSummaryService.fetchObservationsData(["LLA, Level of amputation"], $scope.enrollment, undefined, "latest").then(function (response) {
            var data = physioSummaryService.mapStumpCircumference(response.data);
            $scope.stumpCircumferences = {title: "Stump Circumference", data: data};
        });
        $q.all([p1, p2]).then(function () {
            defer.resolve();
        });
        $scope.isStumpCircumference = physioSummaryService.isStumpCircumference;
    };

    return {
        link: link,
        scope: {
            patient: "=",
            section: "=",
            enrollment: "="
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).service("physioSummaryScoresService", ["physioSummaryService", function (physioSummaryService) {
    const getContainer = function (baseHolder, conceptName) {
        var holder = baseHolder[conceptName] || {};
        holder.display = conceptName;
        holder.rows = holder.rows || [];
        return holder;
    };

    const findByConceptNameToDisplay = physioSummaryService.findByConceptNameToDisplay;

    var mapMaxillofacialPhysioAssessment = function (record, holder) {
        var dateRecorded = findByConceptNameToDisplay(record.groupMembers, "Date recorded");
        var facialDisabilityIndex = findByConceptNameToDisplay(record.groupMembers, "Facial Disability Index");
        var totalScore = findByConceptNameToDisplay(facialDisabilityIndex.groupMembers, "Total score (FDI)");

        var physicalFunction = findByConceptNameToDisplay(facialDisabilityIndex.groupMembers, "Physical Function");
        var physicalFunctionScore = findByConceptNameToDisplay(physicalFunction.groupMembers, "Physical Function Score");
        var socialFunction = findByConceptNameToDisplay(facialDisabilityIndex.groupMembers, "Social Function");

        var socialWellbeingScore = findByConceptNameToDisplay(socialFunction.groupMembers, "Social Wellbeing Score");
        holder.headers = ["Date recorded", "Physical Function", "Social Wellbeing", "Total score (FDI)"];
        holder.rows.push({values: [dateRecorded.value, physicalFunctionScore.value, socialWellbeingScore.value, totalScore.value]});
        return holder;
    };

    var getExtremityFunctionalIndex = function (groupMembers, primaryConceptName, secondaryConceptName) {
        var extremityFunctionalIndex = findByConceptNameToDisplay(groupMembers, primaryConceptName);
        if (_.isEmpty(extremityFunctionalIndex)) {
            extremityFunctionalIndex = findByConceptNameToDisplay(groupMembers, secondaryConceptName);
        }
        return extremityFunctionalIndex;
    };

    const mapUpperLimbAssessment = function (record, holder) {
        var dateRecorded = findByConceptNameToDisplay(record.groupMembers, "Date recorded");
        var basicGripTestMember = findByConceptNameToDisplay(record.groupMembers, "Basic Grip Test");
        var basicGripTotal = findByConceptNameToDisplay(basicGripTestMember.groupMembers, "Total Score");
        var upperExtremityFunctionalIndex = getExtremityFunctionalIndex(record.groupMembers, "Upper Extremity Functional Index (UEFI) - 15", "Pediatric Upper Extremity Function ( Fine Motor, ADL)");
        var upperExtremityFunctionalIndexTotal = findByConceptNameToDisplay(upperExtremityFunctionalIndex.groupMembers, "Final score");
        holder.headers = ["Date Recorded", "Basic Grip Test", "UEFI Total Score"];
        holder.rows.push({values: [dateRecorded.value, basicGripTotal.value, upperExtremityFunctionalIndexTotal.value]});

        return holder;
    };

    const mapLowerLimbAssessment = function (record, holder) {
        var dateRecorded = findByConceptNameToDisplay(record.groupMembers, "Date recorded");
        var member = findByConceptNameToDisplay(record.groupMembers, "Tinetti Balance Assessment Tool");

        var totalScore = findByConceptNameToDisplay(member.groupMembers, "Total Score");
        var riskOfFall = findByConceptNameToDisplay(member.groupMembers, "Risk of Falls");

        var lowerExtremityFunctionalIndex = getExtremityFunctionalIndex(record.groupMembers, "Lower Extremity Functional Index (LEFI)", "Pediatric Lower Extremity Function (Mobility)");
        var lowerIndexTotal = findByConceptNameToDisplay(lowerExtremityFunctionalIndex.groupMembers, "Total Score");

        holder.headers = ["Date recorded", "Tinetti Total Score", "Risk of Falls", "LEFI Total Score"];
        holder.rows.push({values: [dateRecorded.value, totalScore.value, riskOfFall.value, lowerIndexTotal.value]});

        return holder;
    };

    const assessmentMappers = {
        "Lower Limb Physiotherapy Assessment": mapLowerLimbAssessment,
        "Upper Limb Physiotherapy Assessment": mapUpperLimbAssessment,
        "Maxillofacial Physio Assessment": mapMaxillofacialPhysioAssessment
    };

    this.map = function (data, holder) {
        holder = holder || {};
        _.forEach(data, function (record) {
            var conceptNameToDisplay = record.conceptNameToDisplay;
            holder[conceptNameToDisplay] = assessmentMappers[conceptNameToDisplay](record, getContainer(holder, conceptNameToDisplay));
        });
        return holder;
    };

    this.fetchObservationsData = physioSummaryService.fetchObservationsData;

    this.isEmptySummary = function (records) {
        return _.every(records, function (record) {
            return _.isEmpty(record.rows)
        })
    };

    this.isEmptyRecord = function (record) {
        return _.isEmpty(record.rows);
    };

}]).directive("physioSummaryScores", ["appService", 'physioSummaryScoresService', 'spinner', '$q', function (appService, physioSummaryScoresService, spinner, $q) {
    var link = function ($scope, element) {
        var defer = $q.defer();
        spinner.forPromise(defer.promise, element);
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/physioSummaryScores.html";

        const conceptNames = [
            "Lower Limb Physiotherapy Assessment",
            "Upper Limb Physiotherapy Assessment",
            "Maxillofacial Physio Assessment"
        ];

        physioSummaryScoresService.fetchObservationsData(conceptNames, $scope.enrollment, 5).then(function (response) {
            $scope.data = physioSummaryScoresService.map(response.data, {});
            $scope.isEmptySummary = physioSummaryScoresService.isEmptySummary($scope.data);
            defer.resolve();
        });

        $scope.isEmptyRecord = physioSummaryScoresService.isEmptyRecord;
    };

    return {
        link: link,
        scope: {
            patient: "=",
            section: "=",
            enrollment: "="
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]).directive('upperLimbPhysioSummary', ['appService', 'physioSummaryService', 'spinner', '$q', function (appService, physioSummaryService, spinner, $q) {
    const requiredGroupConceptNames = [
        {name: "Shoulder Flex.", sort: 4},
        {name: "Shoulder Ext.", sort: 5},
        {name: "Int. Rotation", sort: 6},
        {name: "Ext. Rotation", sort: 7},
        {name: "Abduction", sort: 8},
        {name: "Adduction", sort: 9},
        {name: "Elbow Flex.", sort: 10},
        {name: "Elbow Ext.", sort: 11},
        {name: "Forearm Sup.", sort: 12},
        {name: "Forearm Pron.", sort: 13},
        {name: "Wrist Flex.", sort: 14},
        {name: "Wrist Ext.", sort: 15},
        {name: "Ulnar Dev.", sort: 16},
        {name: "Radial Dev.", sort: 17}
    ];

    const groupConceptsForROMHandAndFinger = [
        {name: "Wrist", sort: 4},
        {name: "Thumb MC", sort: 5},
        {name: "Thumb DIP", sort: 6},
        {name: "2nd Finger MC", sort: 7},
        {name: "3rd Finger MC", sort: 8},
        {name: "4rd Finger MC", sort: 9},
        {name: "5rd Finger MC", sort: 10},
        {name: "2nd Finger PIP", sort: 11},
        {name: "3nd Finger PIP", sort: 12},
        {name: "4nd Finger PIP", sort: 13},
        {name: "5nd Finger PIP", sort: 14},
        {name: "2nd Finger DIP", sort: 15},
        {name: "2nd Finger DIP", sort: 16},
        {name: "2nd Finger DIP", sort: 17},
        {name: "2nd Finger DIP", sort: 18}
    ];

    const multiLevelGroupConcepts = [
        {name: "Musculocutaneous nerve", leafConcepts: [{name: "Biceps brachii"}]},
        {name: "Axillary nerve", leafConcepts: [{name: "Deltoid"}]},
        {
            name: "Radial nerve", leafConcepts: [{name: "Tricep"}, {name: "Supinator"}, {name: "Ext. C. Rad. L&B"},
            {name: "Ext. C. Ulnaris"}, {name: "Ext. Digiti"}, {name: "Abd. Poll. Longus"}, {name: "Ext. Poll. Longus"},
            {name: "Ext. Indicis"}, {name: "Ext. Dig. Min."}]
        },
        {
            name: "Median nerve", leafConcepts: [{name: "Pronator"}, {name: "Flex. Carpi Radialis"},
            {name: "Flex. Dig. Sup"}, {name: "Flex. Dig Prof"}, {name: "Opp. Pollicis"}, {name: "Flex. Poll. L&B"},
            {name: "Abd. Poll. Brevis"}, {name: "Lumbricalis"}]
        },
        {
            name: "Ulnar nerve",
            leafConcepts: [{name: "Flex. Carpi Uln"}, {name: "Interossei"}, {name: "Add. Poll."}, {name: "Opp /Abd/flex minimi"}]
        }
    ];

    const subConcept = [{
        position: 2, member: {
            sort: 3,
            left: "Left",
            right: "Right",
            display: "Movement",
            isSubHeader: true
        }
    }];

    const tableTitles = [
        {
            name: 'R.O.M Test for Upper Limbs',
            mapper: physioSummaryService.mapObservations,
            requiredGroupConceptNames: requiredGroupConceptNames,
            additionalConcepts: subConcept,
            crucialConcepts: ['Date recorded', 'Type of assessment']
        },
        {
            name: 'Hand and Finger',
            mapper: physioSummaryService.mapMultilevelObservations,
            requiredGroupConceptNames: groupConceptsForROMHandAndFinger,
            additionalConcepts: subConcept,
            crucialConcepts: ['Date recorded', 'Type of assessment']
        },
        {
            name: 'Neurological exam of upper  limb',
            mapper: physioSummaryService.mapMultilevelObservations,
            requiredGroupConceptNames: multiLevelGroupConcepts,
            additionalConcepts: [],
            crucialConcepts: ['Date recorded', 'Type of assessment']
        }
    ];

    const conceptNames = ["Upper Limb Physiotherapy Assessment"];

    var link = function ($scope, element) {
        var defer = $q.defer();
        spinner.forPromise(defer.promise, element);
        $scope.contentUrl = appService.configBaseUrl() + "/customDisplayControl/views/lowerLimbPhysioSummary.html";

        var p1 = physioSummaryService.fetchObservationsData(conceptNames, $scope.enrollment, 5).then(function (response) {
            $scope.groupRecords = physioSummaryService.map(tableTitles, response.data);
        });

        var p2 = physioSummaryService.fetchObservationsData(["ULA, Level of amputation"], $scope.enrollment, undefined, "latest").then(function (response) {
            var data = physioSummaryService.mapStumpCircumference(response.data);
            $scope.stumpCircumferences = {title: "Stump Circumference", data: data};
        });
        $q.all([p1, p2]).then(function () {
            defer.resolve();
        });
        $scope.isStumpCircumference = physioSummaryService.isStumpCircumference;
    };

    return {
        link: link,
        scope: {
            patient: "=",
            section: "=",
            enrollment: "="
        },
        template: '<ng-include src="contentUrl"/>'
    }
}]);