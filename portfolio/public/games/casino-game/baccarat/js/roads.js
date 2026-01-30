// =====================================================
// ROAD TRACKING
// =====================================================

function updateBigRoadData(result) {
    if (result === 'tie') {
        if (bigRoadData.length > 0) {
            bigRoadData[bigRoadData.length - 1].ties++;
        }
        return;
    }

    if (bigRoadData.length === 0) {
        bigRoadData.push({ result, ties: 0, col: 0, row: 0 });
        return;
    }

    const last = bigRoadData[bigRoadData.length - 1];
    
    if (result === last.result) {
        let newRow = last.row + 1;
        let newCol = last.col;
        
        if (newRow > 5) {
            newRow = 5;
            newCol = last.col + 1;
        } else {
            const occupied = bigRoadData.some(d => d.col === newCol && d.row === newRow);
            if (occupied) {
                newRow = last.row;
                newCol = last.col + 1;
            }
        }
        
        bigRoadData.push({ result, ties: 0, col: newCol, row: newRow });
    } else {
        bigRoadData.push({ result, ties: 0, col: last.col + 1, row: 0 });
    }
}
