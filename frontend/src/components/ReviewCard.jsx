import React from 'react';

const stars = ({size, color}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 432 408"><path fill={color} d="M213 328L81 408l35-150L0 157l153-13L213 3l60 141l154 13l-117 101l35 150z"/></svg>

function ReviewCard(
    {userinfo = {
        username: "awesome name 1519",
        profileURL: ""
    },
    reviewInfo = {
        star: 4,
        tag: [],
        review: "omg this restaurant is so damn good"
    }}
){
    const listStars = [];
    for (let i = 0; i < reviewInfo.star; i++) {
        listStars.push(stars({size: "20px" , color: "#BB3D25"}));
    }
    for (let i = reviewInfo.star; i < 5; i++){
        listStars.push(stars({size: "20px" , color: "white"}));
    }
    return(
        <div className="d-flex flex-column border border-secondary rounded" style = {{width: "40%", height: "100%"}}>
            <div className="d-flex">{/* header*/}
                <div> {/* profile picture*/}
                    <img src="../../public/placeholderProfile.png" height="50px" className="rounded-circle my-2"/>

                </div>
                <div>
                    <div className="d-flex flex-column my-2 ms-2">
                        {/*name + star*/}
                        <h6 className="my-0">{userinfo.username}</h6>
                        <div>
                            {listStars}
                        </div>

                    </div>
                    <div className="d-flex">
                        {/*tag*/}
                    </div>
                </div>
            </div>

            <div>
                {reviewInfo.review}
            </div>


        </div>
    )
}


export default ReviewCard;